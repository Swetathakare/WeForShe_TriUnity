// $(document).ready(function() {
//     const communityId = '<%= communityDetails.Community_Id %>'; // Get community id from EJS template
  
//     // Function to fetch and display posts
//     function fetchPosts() {
//       $.ajax({
//         url: `/posts/${communityId}`, // Assuming the route to fetch posts is /posts/:communityId
//         method: 'GET',
//         success: function(posts) {
//           const chatContainer = $('#chatContainer');
//           chatContainer.empty();
  
//           posts.forEach(post => {
//             const postHtml = `
//               <div class="post">
//                 <div class="post-info">
//                   <span>${post.Posted_on}</span> <!-- Display date and time -->
//                   <div class="post-buttons">
//                     <span class="post-button like">Like</span>
//                     <span class="likes">${post.Likes}</span>
//                     <span class="post-button dislike">Dislike</span>
//                     <span class="dislikes">${post.Dislikes}</span>
//                     <span class="post-button comment">Comment</span>
//                     <span class="post-button link">Link</span>
//                   </div>
//                 </div>
//                 <p>${post.Description}</p> <!-- Display post description -->
//               </div>
//             `;
//             chatContainer.append(postHtml);
//           });
//         },
//         error: function(err) {
//           console.error('Error fetching posts:', err);
//           alert('Failed to fetch posts. Please try again later.');
//         }
//       });
//     }
  
//     // Load posts when page loads
//     fetchPosts();
  
//     // Click handler for Add button (for demonstration)
//     $('#addPostBtn').click(function() {
//       alert('This button should open a modal or redirect to an add post page.');
//       // Implement your logic to add a new post
//     });
//   });
  


