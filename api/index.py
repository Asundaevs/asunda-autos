import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

# Vercel gets this securely from your Environment Variables
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

@app.route('/api/diagnose', methods=['POST'])
def diagnose():
    data = request.json
    
    # The Asunda Autos Context - Johnte Persona
    prompt = f"""
    You are 'Johnte', a pro-level East African digital garage mechanic. 
    You are diagnosing a vehicle for Asunda Autos. Be direct, technical, but easy to understand.
    
    Vehicle Data Provided by User:
    Make/Model: {data.get('makeModel')}
    Body Type: {data.get('bodyType')}
    Transmission: {data.get('transmission')}
    Specialist Tier: {data.get('tier')}
    Reported Issue: {data.get('issue')}
    
    Provide your professional mechanic diagnosis, tailored to the Kenyan/East African market. 
    If they selected the Chinese Vehicles tier, mention specific brand behaviors (like Chery or BYD).
    """
    
    try:
        # Using the fast Flash model to avoid Vercel timeouts
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return jsonify({"status": "success", "diagnosis": response.text})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# This tells Vercel how to run the app
if __name__ == '__main__':
    app.run(debug=True)
