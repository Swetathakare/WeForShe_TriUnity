from flask import Flask, request, jsonify
import mysql.connector
import pandas as pd
import spacy
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

nlp = spacy.load('en_core_web_md')

def get_embedding(text):
    doc = nlp(text)
    return doc.vector

def fetch_data():
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Mysql@123',
            database='my_communities'
        )
        query_communities = "SELECT * FROM community"
        communities = pd.read_sql(query_communities, conn)
        query_user_interactions = "SELECT * FROM communityusers"
        user_interactions = pd.read_sql(query_user_interactions, conn)
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None, None
    finally:
        if conn.is_connected():
            conn.close()
    return communities, user_interactions

def prepare_embeddings(communities):
    communities['Embedding'] = communities['Description'].apply(lambda x: get_embedding(x))
    embeddings = communities['Embedding'].tolist()
    return embeddings

def recommend_communities(search_description, communities, embeddings, top_n=3):
    search_embedding = get_embedding(search_description)
    similarities = [cosine_similarity([search_embedding], [emb])[0][0] for emb in embeddings]
    similar_indices = sorted(range(len(similarities)), key=lambda i: similarities[i], reverse=True)[:top_n]
    recommendations = communities.iloc[similar_indices]
    return recommendations[['Community_Name']]

@app.route('/recommend', methods=['GET'])
def recommend():
    query = request.args.get('query', '')
    communities, _ = fetch_data()
    embeddings = prepare_embeddings(communities)
    recommended_communities = recommend_communities(query, communities, embeddings)
    return jsonify(recommended_communities.to_dict(orient='records'))

@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    app.run(port=5000, debug=True)
