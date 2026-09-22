from flask import Flask, request, jsonify, render_template
import xgboost as xgb
import pandas as pd
import numpy as np
import joblib

app = Flask(__name__)

# Load model and expected features
try:
    model = xgb.XGBClassifier()
    model.load_model('xgboost_fraud_model.json')
    expected_features = joblib.load('expected_features.joblib')
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    expected_features = [
        'creditLimit', 'availableMoney', 'transactionAmount', 'merchantName', 
        'acqCountry', 'merchantCountryCode', 'posEntryMode', 'posConditionCode', 
        'merchantCategoryCode', 'transactionType', 'currentBalance', 'cardPresent', 
        'expirationDateKeyInMatch', 'trx_count_24h', 'trx_sum_24h', 'trx_sum_7d', 
        'avg_daily_spend_7d', 'amount_vs_7d_avg', 'transactionHour', 'transactionDayOfWeek', 'cvvMatch'
    ]

# Try to load label encoder (though it might only have classes for transactionType)
try:
    le = joblib.load('label_encoder.joblib')
except:
    le = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model failed to load on server.'}), 500
        
    try:
        data = request.json
        input_data = {}
        
        # Process each expected feature
        for feature in expected_features:
            val = data.get(feature)
            
            # Basic type conversion based on feature name
            if feature in ['creditLimit', 'trx_count_24h', 'transactionHour', 'transactionDayOfWeek']:
                val = int(val) if val else 0
            elif feature in ['availableMoney', 'transactionAmount', 'currentBalance', 'trx_sum_24h', 'trx_sum_7d', 'avg_daily_spend_7d', 'amount_vs_7d_avg']:
                val = float(val) if val else 0.0
            elif feature in ['cardPresent', 'expirationDateKeyInMatch', 'cvvMatch']:
                # handle bools
                if isinstance(val, str):
                    val = 1 if val.lower() == 'true' else 0
                else:
                    val = int(bool(val))
            else:
                # String features that need encoding
                val = str(val) if val else 'UNKNOWN'
                # Attempt to encode, fallback to 0 if unknown/error
                encoded_val = 0
                if le and hasattr(le, 'classes_'):
                    if val in le.classes_:
                        encoded_val = le.transform([val])[0]
                val = encoded_val
                
            input_data[feature] = [val]

        # Create DataFrame ensuring columns match exactly what XGBoost expects
        df = pd.DataFrame(input_data)[expected_features]
        
        # Predict
        prob = model.predict_proba(df)[0][1]
        is_fraud = bool(prob > 0.5)
        
        return jsonify({
            'fraud': is_fraud,
            'probability': float(prob)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5050)
