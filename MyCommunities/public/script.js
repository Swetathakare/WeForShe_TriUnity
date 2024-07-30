const imageInput = document.getElementById('image');
const previewImage = document.getElementById('preview');

imageInput.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();

    reader.onload = function(e) {
      previewImage.src = e.target.result;
      previewImage.classList.remove('hidden');
    };

    reader.readAsDataURL(e.target.files[0]);
  } else {
    previewImage.src = ""; // Clear image source if no file selected
    previewImage.classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-input').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      searchCommunities();
    }
  });
});

function searchCommunities() {
  const searchInput = document.getElementById('search-input').value;
  fetch('/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description: searchInput }),
  })
  .then(response => response.json())
  .then(data => {
    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.innerHTML = '<h3>Recommended Communities for You:</h3>';
    if (data.communities.length > 0) {
      data.communities.forEach(community => {
        recommendationsDiv.innerHTML += <p>${community.Community_Name}</p>;
      });
    } else {
      recommendationsDiv.innerHTML += '<p>No communities found.</p>';
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}