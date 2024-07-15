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
