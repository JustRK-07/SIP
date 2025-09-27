const twilio = require('twilio');

/**
 * Service class for Twilio operations
 * Centralizes Twilio client initialization and common operations
 */
class TwilioService {
  constructor() {
    this._client = null;
  }

  /**
   * Get initialized Twilio client
   * @returns {import('twilio').Twilio} Twilio client instance
   * @throws {Error} If Twilio credentials are not configured
   */
  getClient() {
    if (!this._client) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials are required in environment variables');
      }
      
      this._client = twilio(accountSid, authToken);
    }
    
    return this._client;
  }

  /**
   * Check if Twilio is properly configured
   * @returns {boolean} True if credentials are available
   */
  isConfigured() {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  }

  /**
   * Create an Elastic SIP Trunk
   * @param {Object} options Trunk configuration options
   * @param {string} options.friendlyName Friendly name for the trunk
   * @param {string} options.domainName Domain name for the trunk
   * @param {boolean} [options.cnamLookupEnabled=true] Enable CNAM lookup
   * @param {boolean} [options.recordingEnabled=false] Enable recording
   * @param {boolean} [options.secure=true] Use secure connection
   * @param {string} [options.transferMode='enable-all'] Transfer mode
   * @returns {Promise<Object>} Created trunk information
   */
  async createElasticSipTrunk(options) {
    const client = this.getClient();
    
    const {
      friendlyName,
      domainName,
      cnamLookupEnabled = true,
      recordingEnabled = false,
      secure = true,
      transferMode = 'enable-all'
    } = options;

    return await client.trunking.v1.trunks.create({
      friendlyName,
      domainName,
      cnamLookupEnabled,
      recordingEnabled,
      secure,
      transferMode
    });
  }

  /**
   * Create origination URL for a trunk
   * @param {Object} trunk Twilio trunk instance
   * @param {Object} options Origination URL options
   * @param {string} options.friendlyName Friendly name for the URL
   * @param {string} options.sipUrl SIP URL
   * @param {boolean} [options.enabled=true] Enable the URL
   * @param {number} [options.weight=10] Weight for load balancing
   * @param {number} [options.priority=10] Priority for routing
   * @returns {Promise<Object>} Created origination URL information
   */
  async createOriginationUrl(trunk, options) {
    const {
      friendlyName,
      sipUrl,
      enabled = true,
      weight = 10,
      priority = 10
    } = options;

    return await trunk.originationUrls().create({
      friendlyName,
      enabled,
      sipUrl,
      weight,
      priority
    });
  }

  /**
   * Purchase a phone number from Twilio
   * @param {Object} options Purchase options
   * @param {string} options.phoneNumber Phone number to purchase
   * @param {string} options.friendlyName Friendly name for the number
   * @param {string} [options.trunkSid] Trunk SID to associate with
   * @returns {Promise<Object>} Purchased number information
   */
  async purchasePhoneNumber(options) {
    const client = this.getClient();
    
    const purchaseParams = {
      phoneNumber: options.phoneNumber,
      friendlyName: options.friendlyName,
    };
    
    // Include trunkSid if provided to automatically associate with the Twilio trunk
    if (options.trunkSid) {
      purchaseParams.trunkSid = options.trunkSid;
    }
    
    return await client.incomingPhoneNumbers.create(purchaseParams);
  }

  /**
   * Search for available phone numbers
   * @param {Object} searchParams Search parameters
   * @param {string} [searchParams.country='US'] Country code
   * @param {string} searchParams.type Number type (LOCAL, MOBILE, TOLL_FREE)
   * @param {string} [searchParams.areaCode] Area code to search for
   * @param {string} [searchParams.contains] Digits that the number should contain
   * @param {number} [searchParams.limit=20] Maximum number of results
   * @returns {Promise<Array>} Available phone numbers
   */
  async searchAvailableNumbers(searchParams) {
    const client = this.getClient();
    
    const {
      country = 'US',
      type,
      areaCode,
      contains,
      limit = 20
    } = searchParams;

    const searchOptions = {
      limit: Math.min(50, Math.max(1, limit)),
      ...(areaCode && { areaCode }),
      ...(contains && { contains })
    };

    let availableNumbers = [];

    if (type === 'TOLL_FREE') {
      availableNumbers = await client.availablePhoneNumbers(country)
        .tollFree
        .list(searchOptions);
    } else if (type === 'MOBILE') {
      availableNumbers = await client.availablePhoneNumbers(country)
        .mobile
        .list(searchOptions);
    } else {
      // LOCAL or default
      availableNumbers = await client.availablePhoneNumbers(country)
        .local
        .list(searchOptions);
    }

    return availableNumbers;
  }

  /**
   * Release a phone number from Twilio
   * @param {string} phoneNumber Phone number to release (in E.164 format)
   * @returns {Promise<Object>} Release result information
   */
  async releasePhoneNumber(phoneNumber) {
    const client = this.getClient();
    
    try {
      // Find the phone number in Twilio by searching incoming phone numbers
      const incomingNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      
      if (incomingNumbers.length === 0) {
        throw new Error(`Phone number ${phoneNumber} not found in Twilio account`);
      }
      
      const twilioNumber = incomingNumbers[0];
      
      // Delete the phone number from Twilio
      await client.incomingPhoneNumbers(twilioNumber.sid).remove();
      
      return {
        success: true,
        phoneNumber: phoneNumber,
        twilioSid: twilioNumber.sid,
        releasedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error releasing phone number ${phoneNumber} from Twilio:`, error);
      throw error;
    }
  }

  /**
   * Handle Twilio errors and provide user-friendly error codes
   * @param {Error} error Twilio error
   * @returns {Object} Formatted error information
   */
  handleTwilioError(error) {
    let errorMessage = 'Failed to perform Twilio operation';
    let errorCode = 'TWILIO_ERROR';
    
    if (error.code === 21452) {
      errorMessage = 'Phone number is no longer available for purchase';
      errorCode = 'NUMBER_NOT_AVAILABLE';
    } else if (error.code === 21421) {
      errorMessage = 'Invalid phone number format';
      errorCode = 'INVALID_PHONE_NUMBER';
    } else if (error.code === 20003) {
      errorMessage = 'Authentication failed - check Twilio credentials';
      errorCode = 'TWILIO_AUTH_ERROR';
    } else if (error.code === 20404) {
      errorMessage = 'Phone number not found in Twilio account';
      errorCode = 'NUMBER_NOT_FOUND';
    }
    
    return {
      message: errorMessage,
      code: errorCode,
      details: error.message,
      twilioCode: error.code
    };
  }
}

// Export singleton instance
module.exports = new TwilioService();