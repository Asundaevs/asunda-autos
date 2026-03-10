import os
import google.generativeai as genai
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import tempfile

app = Flask(__name__)

# Vercel handles this environment variable securely
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

@app.route('/api/index', methods=['POST'])
def handle_diagnostic():
    try:
        tier = request.form.get('tier')
        user_name = request.form.get('userName')
        plate_number = request.form.get('plateNumber')
        profile = request.form.get('profile')
        media_file = request.files.get('media')

        # The "Johnte" Signature Persona
        system_instruction = f"""
        You are Johnte, a legendary master mechanic born and bred in an East African garage environment. 
        You love technology but hate corporate fluff. You are helping {user_name} with their vehicle (Plate: {plate_number}).
        
        INSTRUCTIONS:
        1. Speak naturally to the region. Depending on the vehicle and issue, weave in authentic local language (like Kenyan Sheng - e.g., 'Hiyo gari inaleta rada', 'Waseh wa mtaa', 'Check hiyo belt') to build rapport, but ensure the core mechanical advice is 100% technically accurate and professional.
        2. Analyze the vehicle profile and provided media (if any) specifically for the '{tier}' service tier.
        3. Be authoritative. If a part needs replacing, say it. Warn against common mistakes for this specific Make/Model.
        4. Do not mention that you are an AI. You are Johnte.
        """
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction
        )

        prompt = f"Service Requested: {tier}\n\nVehicle Profile & Issue:\n{profile}\n\nDiagnose the issue based on these details and any attached media."
        
        if media_file:
            # Serverless-safe temporary save
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, secure_filename(media_file.filename))
            media_file.save(file_path)
            
            # Upload to Gemini (Multimodal)
            uploaded_gemini_file = genai.upload_file(path=file_path)
            
            # Generate Multimodal Response
            response = model.generate_content([uploaded_gemini_file, prompt])
            
            # PRIVACY PURGE: Immediate deletion
            genai.delete_file(uploaded_gemini_file.name)
            os.remove(file_path)
        else:
            # Text-only response
            response = model.generate_content(prompt)

        return jsonify({"response": response.text})

    except Exception as e:
        # ADMIN FACING: Prints exact technical error to Vercel Logs
        print(f"CRITICAL API ERROR: {str(e)}")
        # Returns 500 to trigger the "Johnte is in the garage..." user message on frontend
        return jsonify({"error": "Internal Processing Error"}), 500

if __name__ == '__main__':
    app.run()
