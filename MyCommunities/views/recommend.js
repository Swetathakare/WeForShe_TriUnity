const mysql = require('mysql');
const axios = require('axios');
const cosineSimilarity = require('compute-cosine-similarity');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Mysql@123',
  database: 'my_communities'
});

connection.connect();

const getEmbedding = async (text) => {
  try {
    const response = await axios.post('http://localhost:8000/get_embedding', { text: text });
    return response.data.vector;
  } catch (error) {
    console.error('Error fetching embedding:', error);
    return null;
  }
};

const fetchData = () => {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM community', (error, communities) => {
      if (error) {
        return reject(error);
      }

      connection.query('SELECT * FROM communityusers', (error, userInteractions) => {
        if (error) {
          return reject(error);
        }

        resolve({ communities, userInteractions });
      });
    });
  });
};

const prepareEmbeddings = async (communities) => {
  const embeddings = await Promise.all(
    communities.map(async (community) => {
      const embedding = await getEmbedding(community.Description);
      community.Embedding = embedding;
      return embedding;
    })
  );
  return embeddings;
};

const recommendCommunities = async (searchDescription, communities, embeddings, topN = 3) => {
  const searchEmbedding = await getEmbedding(searchDescription);

  const similarities = embeddings.map((embedding) => cosineSimilarity(searchEmbedding, embedding));

  const similarIndices = similarities
    .map((similarity, index) => ({ similarity, index }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
    .map((item) => item.index);

  return similarIndices.map((index) => communities[index].Community_Name);
};

const main = async () => {
  try {
    const { communities, userInteractions } = await fetchData();

    const embeddings = await prepareEmbeddings(communities);

    const searchDesc = 'office wear';
    const recommendedCommunities = await recommendCommunities(searchDesc, communities, embeddings);

    console.log('Recommended Communities:');
    console.log(recommendedCommunities);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    connection.end();
  }
};

main();
