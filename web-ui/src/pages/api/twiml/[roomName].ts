import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import twilio from 'twilio';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roomName } = req.query;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create TwiML response to connect the call to LiveKit
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Connect the call to LiveKit room
  const dial = twiml.dial();
  dial.sip(`sip:${roomName}@your-livekit-sip-domain.com`); // You'll need to configure this with your LiveKit SIP domain
  
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
}
