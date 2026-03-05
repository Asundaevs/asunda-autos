import os
import json
import urllib.request
from http.server import BaseHTTPRequestHandler

# The "Logbook" for Free Tier tracking (Tracks IP addresses)
FREE_TIER_USAGE = {}

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle CORS (Allows your frontend to talk to this backend safely)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            # 1. Receive the data from the website
            data = json.loads(post_data.decode('utf-8'))
            tier = str(data.get('tier', '0'))
            plate = data.get('plate', 'Unknown')
            vin = data.get('vin', 'Unknown')
            engine = data.get('engineCode', 'Unknown')
            issue = data.get('issue', 'General checkup')
            
            # 2. Free Tier Logic (3 Strikes Rule)
            client_ip = self.headers.get('X-Forwarded-For', 'unknown_ip').split(',')[0]
            
            if tier == "0":
                current_usage = FREE_TIER_USAGE.get(client_ip, 0)
                if current_usage >= 3:
                    error_msg = "Wazi! Umetumia nafasi zako tatu za bure za Chassis Decoder. Sasa rudi kwa menu uchague tier ingine ulipe ndio tusaidiane kazi ya ukweli."
                    self._send_response(400, {"error": error_msg})
                    return
                FREE_TIER_USAGE[client_ip] = current_usage + 1
            
            # 3. Security Check: API Keys
            gemini_key = os.environ.get("GEMINI_API_KEY")
            intasend_secret = os.environ.get("INTASEND_SECRET_KEY")
            
            if not gemini_key:
                self._send_response(500, {"error": "System Down: Johnte's AI brain is disconnected. Check Vercel Keys."})
                return

            # 4. The Johnte Persona & East African Context
            system_prompt = """You are Johnte, a legendary and highly skilled East African garage mechanic (Kenya, Uganda, Tanzania, Rwanda). 
            You speak a natural mix of professional automotive English, Swahili, and Sheng. 
            Be direct, candid, and highly technical, but explain things so a regular driver can understand. 
            Factor in East African driving conditions like heavy dust, potholes, imported ex-JDM cars, Chinese EVs, and coastal humidity/rust.
            Provide actionable advice, realistic costs, and warn them if the vehicle is dangerous to drive."""
            
            user_prompt = f"Vehicle Specs -> Plate: {plate}, VIN: {vin}, Engine: {engine}. \nTier Selected: Option {tier} out of 18. \nCustomer Issue: {issue}. \nProvide a thorough diagnostic report based ONLY on the selected tier's focus area."

            # 5. Connect to Gemini 1.5 Flash
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}]
            }
            
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
            
            with urllib.request.urlopen(req) as response:
                res_body = response.read()
                ai_data = json.loads(res_body.decode('utf-8'))
                
                # Extract Johnte's answer
                report = ai_data['candidates'][0]['content']['parts'][0]['text']
                self._send_response(200, {"report": report})
                
        except Exception as e:
            self._send_response(500, {"error": f"Aiseee, gari imekataa kuwaka (System Error): {str(e)}"})

    def _send_response(self, status_code, payload):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))
