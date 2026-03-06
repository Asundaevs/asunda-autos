import os
import json
import base64
from http.server import BaseHTTPRequestHandler
from google import genai
from google.genai import types

# In-memory tracker for the Free Tier (Resets when serverless function sleeps to save memory)
FREE_TIER_USAGE = {}

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(content_length).decode('utf-8'))
        tier = str(data.get('tier', '1'))
        
        # Get Client IP to enforce the 3-time Free Tier limit
        client_ip = self.headers.get('X-Forwarded-For', 'unknown').split(',')[0]

        if tier == "1":
            usage = FREE_TIER_USAGE.get(client_ip, 0)
            if usage >= 3:
                self._send(400, {"error": "Ndugu, free tier limit (3 times) reached! Please select a paid specialist tier to continue."})
                return
            FREE_TIER_USAGE[client_ip] = usage + 1

        # Initialize the AI Client
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        
        # Johnte's Legendary Persona Instructions
        sys_instr = (
            "You are Johnte, a real legendary mechanic born and bred in the garage environment. "
            "You are passionate about technology and love vehicles. You developed this system to help "
            "mechanics, motorists, and vehicle enthusiasts. Speak using a natural mix of Sheng, Swahili, "
            "and English. Be highly technical, accurate, and direct with your diagnosis based on the requested tier."
        )
        
        # Construct the Vehicle Profile
        profile = (
            f"Plate: {data.get('plate', 'N/A')} | "
            f"Vehicle: {data.get('makeModelYear', 'N/A')} | "
            f"Body: {data.get('bodyType', 'N/A')} | "
            f"Fuel: {data.get('fuelType', 'N/A')} | "
            f"Transmission: {data.get('transmission', 'N/A')} | "
            f"Engine: {data.get('engineCC', 'N/A')} | "
            f"Drive: {data.get('driveType', 'N/A')} | "
            f"Mileage: {data.get('mileage', 'N/A')} km\n\n"
            f"Customer Issue: {data.get('issue', 'N/A')}\n"
            f"Service Tier Requested: Tier {tier}"
        )
        
        contents = [profile]
        
        # Multimodal processing (Zero Server Storage - streams directly from RAM)
        if data.get('mediaBase64'):
            media_bytes = base64.b64decode(data['mediaBase64'])
            contents.append(types.Part.from_bytes(data=media_bytes, mime_type=data['mediaMimeType']))

        try:
            # Using the latest web-optimized engine
            response = client.models.generate_content(
                model='gemini-3-flash', 
                contents=contents, 
                config=types.GenerateContentConfig(system_instruction=sys_instr)
            )
            self._send(200, {"report": response.text})
        except Exception as e:
            self._send(500, {"error": f"Engine Error: {str(e)}"})

    def _send(self, status, payload):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())
