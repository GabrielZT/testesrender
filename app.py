import os
from flask import Flask, jsonify

app = Flask(__name__)

# Rota GET: recebe o número pela URL (ex: /dobro/5)
@app.route('/dobro/<int:numero>', methods=['GET'])
def dobrar_numero(numero):
    return jsonify({
        'recebido': numero,
        'dobro': numero * 2
    })

if __name__ == '__main__':
    # O Render precisa que o host seja 0.0.0.0
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)