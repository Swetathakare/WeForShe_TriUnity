const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const multer = require('multer');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session middleware setup
app.use(session({
  secret: 'your-secret-key', // Replace with your own secret key
  resave: false,
  saveUninitialized: true,
}));

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Mysql@123',
  database: 'my_communities'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    throw err;
  }
  console.log('MySQL Connected...');
});

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Login post request
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(username);
  console.log(password);
  const query = 'SELECT U_id FROM users WHERE U_Name = ? AND Password = ?';

  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).send('Internal Server Error');
    }
    
    if (results.length > 0) {
      const userId = results[0].U_id;
      console.log("Hi"+userId);
      req.session.user_id = userId;
      res.redirect('/dashboard');
    } else {
      res.send('Invalid credentials');
    }
  });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  const userId = req.session.user_id;

  if (!userId) {
    return res.send('Please log in to view this page.');
  }

  // Fetch user-specific data for user communities
  const userCommunitiesQuery = `
    SELECT c.Community_Name
    FROM communityusers cu
    INNER JOIN Community c ON cu.Community_Id = c.Community_Id
    WHERE cu.User_Id = ?
  ;
  `
  db.query(userCommunitiesQuery, [userId], (err, userCommunities) => {
    if (err) {
      console.error('Error fetching user communities:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Fetch explore communities not joined by the user
    const exploreCommunitiesQuery = `
      SELECT c.Community_Name, c.Community_Id
      FROM Community c
      WHERE c.Community_Id NOT IN (
        SELECT Community_Id
        FROM communityusers
        WHERE User_Id = ?
      )
    ;
    `
    db.query(exploreCommunitiesQuery, [userId], (err, exploreCommunities) => {
      if (err) {
        console.error('Error fetching explore communities:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Render dashboard with fetched data
      res.render('dashboard', {
        userCommunities: userCommunities,
        exploreCommunities: exploreCommunities, // Pass exploreCommunities data here
        userId: userId
      });
    });
  });
});

// Route to fetch and display comments for a post
app.get('/community/:community_id/post/:post_id/comments', (req, res) => {
  const communityId = req.params.community_id;
  const postId = req.params.post_id;

  // Fetch comments for the specified post
  const commentsQuery = `
    SELECT c.CommentID, c.Comment_Text, c.Comment_Date, u.U_Name as Author
    FROM Comments c
    INNER JOIN Users u ON c.UserID = u.U_id
    WHERE c.PostID = ?
  `;

  db.query(commentsQuery, [postId], (err, comments) => {
    if (err) {
      console.error('Error fetching comments:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Render the comments page with fetched data
    res.render('comments', {
      comments: comments,
      postId: postId  // Pass the postId to identify which post's comments are being displayed
    });
  });
});

// Route to render the new post form
app.get('/new-post', (req, res) => {
  const communityId = req.query.community_id;
  res.render('newpost', { communityId: communityId });
});

// Route to handle the form submission
app.post('/add-post', upload.single('image'), (req, res) => {
  const { Community_Id, description, productLink } = req.body;
  const UserID = req.session.user_id; // Get the user ID from the session
  const Posted_on = new Date(); // Current date
  const image = req.file ? req.file.buffer : null; // Handle image upload

  // Insert into posts table
  const sql = `INSERT INTO posts (Community_Id, Description, Likes, Dislikes, imageURL, UserID, Posted_on, productLink) 
               VALUES (?, ?, 0, 0, ?, ?, ?, ?)`;
  db.query(sql, [Community_Id, description, image, UserID, Posted_on, productLink], (err, result) => {
    if (err) {
      console.error('Error inserting post:', err);
      res.status(500).send('Error inserting post');
    } else {
      console.log('Post added successfully');
      // Redirect to the community posts page after submission
      res.redirect(`/community/${Community_Id}/posts`);
    }
  });
});

// // Explore route
app.get('/explore', (req, res) => {
  const userId = req.session.user_id;

  if (!userId) {
    return res.send('Please log in to view this page.');
  }

  // Fetch user-specific data for explore page
  const userCommunitiesQuery = `
    SELECT c.Community_Name, c.Community_Id
    FROM communityusers cu
    INNER JOIN Community c ON cu.Community_Id = c.Community_Id
    WHERE cu.User_Id = ?
  `;
  db.query(userCommunitiesQuery, [userId], (err, userCommunities) => {
    if (err) {
      console.error('Error fetching user communities:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Fetch explore communities not joined by the user
    const exploreCommunitiesQuery = `
      SELECT c.Community_Name, c.Community_Id
      FROM Community c
      WHERE c.Community_Id NOT IN (
        SELECT Community_Id
        FROM communityusers
        WHERE User_Id = ?
      )
    `;
    db.query(exploreCommunitiesQuery, [userId], (err, exploreCommunities) => {
      if (err) {
        console.error('Error fetching explore communities:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Render explore page with fetched data
      res.render('explore', {
        userCommunities: userCommunities,
        exploreCommunities: exploreCommunities,
        userId: userId
      });
    });
  });
});

// Join community route (example implementation)
app.get('/join', (req, res) => {
  const userId = req.session.user_id; // Assuming you pass user_id via session
  const communityId = req.query.community_id; // Assuming you pass community_id via query params

  if (!userId || !communityId) {
    return res.send('Invalid request.');
  }

  // Example logic to add user to community (insert into communityusers table)
  const insertQuery = 'INSERT INTO communityusers (Community_Id, User_Id) VALUES (?, ?)';
  db.query(insertQuery, [communityId, userId], (err, results) => {
    if (err) {
      console.error('Error joining community:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/dashboard'); // Redirect back to dashboard after joining
  });
});


// Community details route
app.get('/community/:id', (req, res) => {
  const communityId = req.params.id;
  const userId = req.session.user_id; // Assuming user ID is stored in session

  // Query to fetch community details
  const communityDetailsQuery = 'SELECT * FROM Community WHERE Community_Id = ?';
  // Query to check if the logged-in user is joined to this community
  const checkJoinedQuery = 'SELECT * FROM CommunityUsers WHERE Community_Id = ? AND User_Id = ?';

  // Fetch community details
  db.query(communityDetailsQuery, [communityId], (err, result) => {
    if (err) {
      console.error('Error fetching community details:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (result.length === 0) {
      res.status(404).send('Community not found'); // Handle if community is not found
      return;
    }

    const communityDetails = result[0];

    // If the community has a picture, convert it to Base64 for display
    if (communityDetails.picture) {
      communityDetails.picture = Buffer.from(communityDetails.picture).toString('base64');
    }

    // Check if the user is joined to this community
    db.query(checkJoinedQuery, [communityId, userId], (err, joinResult) => {
      if (err) {
        console.error('Error checking if user is joined:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      const isJoined = joinResult.length > 0;

      // Query to fetch top 3 users based on myntra_points for the community
      const topUsersQuery = `
        SELECT u.U_Name as Username, u.Myntra_Points
  FROM Users u
  JOIN communityusers cu ON u.U_id = cu.User_Id
  WHERE cu.Community_Id = ?
  ORDER BY u.Myntra_Points DESC
  LIMIT 3;
      `;

      // Fetch top users
      db.query(topUsersQuery, [communityId], (err, topUsersResult) => {
        if (err) {
          console.error('Error fetching top users:', err);
          res.status(500).send('Internal Server Error');
          return;
        }

        // Render community details page with all fetched data
        res.render('communitydetails', {
          communityDetails,
          isJoined,
          topUsers: topUsersResult, // Pass top users data to the template
          communityId // Pass communityId for any further actions if needed
        });
      });
    });
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/'); // Redirect to login page after logout
  });
});

// Community posts route
app.get('/community/:id/posts', (req, res) => {
  const communityId = req.params.id;
  const userId = req.session.user_id; // Assuming you store the logged-in user's ID in the session

  if (!userId) {
    return res.send('Please log in to view this page.');
  }

  // Fetch community name and ID
  const communityQuery = 'SELECT Community_Id, Community_Name FROM Community WHERE Community_Id = ?';

  db.query(communityQuery, [communityId], (err, communityResult) => {
    if (err) {
      console.error('Error fetching community details:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (communityResult.length === 0) {
      return res.status(404).send('Community not found');
    }

    const community = communityResult[0];

    // Fetch all posts for the given community
    const postsQuery = `
      SELECT p.PostID, p.Description, p.Likes, p.Dislikes, p.imageURL, p.Posted_on, p.productLink, u.U_Name as Author
      FROM posts p
      INNER JOIN users u ON p.UserID = u.U_id
      WHERE p.Community_Id = ?
    `;

    db.query(postsQuery, [community.Community_Id], (err, posts) => {
      if (err) {
        console.error('Error fetching posts:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Convert binary images to Base64 strings
      posts.forEach(post => {
        if (post.imageURL) {
          post.imageURL = Buffer.from(post.imageURL).toString('base64');
        }
      });

      res.render('communityposts', {
        posts: posts,
        community: community, // Pass the entire community object
        postId: posts.length > 0 ? posts[0].PostID : null // Pass the first post ID (or null if no posts)
      });
    });
  });
});

// Route to handle adding a comment
app.post('/add-comment', (req, res) => {
  const { postId, commentText } = req.body;
  const userId = req.session.user_id; // Assuming you store the logged-in user's ID in the session

  if (!userId) {
    return res.send('Please log in to add a comment.');
  }

  const addCommentQuery = 'INSERT INTO comments (PostID, UserID, Comment_Text, Comment_Date) VALUES (?, ?, ?, NOW())';

  db.query(addCommentQuery, [postId, userId, commentText], (err, result) => {
    if (err) {
      console.error('Error adding comment:', err);
      return res.status(500).send('Internal Server Error');
    }

    res.json({ success: true });
  });
});

//likes and dislikes section
app.post('/like', (req, res) => {
  const { postId } = req.body;
  const userId = req.session.user_id; // Assuming userId is stored in session

  // Check if there's already a reaction for this post and user
  const checkReactionQuery = `
    SELECT Reaction_Status
    FROM userreactedonpost
    WHERE Post_ID = ? AND User_ID = ?;
  `;
  
  db.query(checkReactionQuery, [postId, userId], (err, results) => {
    if (err) {
      console.error('Error checking reaction:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    let currentReactionStatus = 0; // Default reaction status (unreacted)

    if (results.length > 0) {
      // Reaction exists, get current status
      currentReactionStatus = results[0].Reaction_Status;
    }

    if (currentReactionStatus === 1) {
      // Already liked, remove like (reaction status to 0) and decrement like count
      const removeLikeQuery = `
        UPDATE userreactedonpost
        SET Reaction_Status = 0
        WHERE Post_ID = ? AND User_ID = ?;
      `;
      
      db.query(removeLikeQuery, [postId, userId], (err, updateResult) => {
        if (err) {
          console.error('Error removing like:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Decrease like count in posts table
        const decreaseLikeCountQuery = `
          UPDATE posts
          SET Likes = Likes - 1
          WHERE PostID = ?;
        `;

        db.query(decreaseLikeCountQuery, [postId], (err, updateResult) => {
          if (err) {
            console.error('Error decrementing like count:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          // Get updated counts
          fetchReactionCounts(postId, res);
        });
      });
    } else if (currentReactionStatus === 2) {
      // Already disliked, change to liked (reaction status to 1), decrement dislike and increment like
      const updateReactionQuery = `
        UPDATE userreactedonpost
        SET Reaction_Status = 1
        WHERE Post_ID = ? AND User_ID = ?;
      `;

      db.query(updateReactionQuery, [postId, userId], (err, updateResult) => {
        if (err) {
          console.error('Error updating reaction:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Decrease dislike count in posts table
        const decreaseDislikeCountQuery = `
          UPDATE posts
          SET Dislikes = Dislikes - 1
          WHERE PostID = ?;
        `;

        db.query(decreaseDislikeCountQuery, [postId], (err, updateResult) => {
          if (err) {
            console.error('Error decrementing dislike count:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          // Increase like count in posts table
          const increaseLikeCountQuery = `
            UPDATE posts
            SET Likes = Likes + 1
            WHERE PostID = ?;
          `;

          db.query(increaseLikeCountQuery, [postId], (err, updateResult) => {
            if (err) {
              console.error('Error incrementing like count:', err);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Get updated counts
            fetchReactionCounts(postId, res);
          });
        });
      });
    } else {
      // Unreacted or no entry, set reaction status to 1 and increment like count
      const insertOrUpdateQuery = `
        INSERT INTO userreactedonpost (Post_ID, User_ID, Reaction_Status)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE Reaction_Status = 1;
      `;
      
      db.query(insertOrUpdateQuery, [postId, userId], (err, updateResult) => {
        if (err) {
          console.error('Error liking post:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Increase like count in posts table
        const increaseLikeCountQuery = `
          UPDATE posts
          SET Likes = Likes + 1
          WHERE PostID = ?;
        `;

        db.query(increaseLikeCountQuery, [postId], (err, updateResult) => {
          if (err) {
            console.error('Error incrementing like count:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          // Get updated counts
          fetchReactionCounts(postId, res);
        });
      });
    }
  });
});

// Function to fetch like and dislike counts
function fetchReactionCounts(postId, res) {
  const getLikeCountQuery = `
    SELECT Likes
    FROM posts
    WHERE PostID = ?;
  `;

  const getDislikeCountQuery = `
    SELECT Dislikes
    FROM posts
    WHERE PostID = ?;
  `;

  // Fetch like count
  db.query(getLikeCountQuery, [postId], (err, resultLikes) => {
    if (err) {
      console.error('Error fetching like count:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const newLikeCount = resultLikes[0].Likes;

    // Fetch dislike count
    db.query(getDislikeCountQuery, [postId], (err, resultDislikes) => {
      if (err) {
        console.error('Error fetching dislike count:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const newDislikeCount = resultDislikes[0].Dislikes;

      res.json({
        status: 'success',
        action: 'like',
        postId: postId,
        newLikeCount: newLikeCount,
        newDislikeCount: newDislikeCount
      });
    });
  });
}

app.post('/dislike', (req, res) => {
  const { postId } = req.body;
  const userId = req.session.user_id; // Assuming userId is stored in session

  // Check if there's already a reaction for this post and user
  const checkReactionQuery = `
    SELECT Reaction_Status
    FROM userreactedonpost
    WHERE Post_ID = ? AND User_ID = ?;
  `;
  
  db.query(checkReactionQuery, [postId, userId], (err, results) => {
    if (err) {
      console.error('Error checking reaction:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    let currentReactionStatus = 0; // Default reaction status (unreacted)

    if (results.length > 0) {
      // Reaction exists, get current status
      currentReactionStatus = results[0].Reaction_Status;
    }

    if (currentReactionStatus === 2) {
      // Already disliked, remove dislike (reaction status to 0) and decrement dislike count
      const removeDislikeQuery = `
        UPDATE userreactedonpost
        SET Reaction_Status = 0
        WHERE Post_ID = ? AND User_ID = ?;
      `;
      
      db.query(removeDislikeQuery, [postId, userId], (err, updateResult) => {
        if (err) {
          console.error('Error removing dislike:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Decrease dislike count in posts table
        const decreaseDislikeCountQuery = `
          UPDATE posts
          SET Dislikes = Dislikes - 1
          WHERE PostID = ?;
        `;

        db.query(decreaseDislikeCountQuery, [postId], (err, updateResult) => {
          if (err) {
            console.error('Error decrementing dislike count:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          // Get updated counts
          fetchReactionCounts(postId, res);
        });
      });
    } else if (currentReactionStatus === 1) {
      // Already liked, change to disliked (reaction status to 2), increment dislike and decrement like
      const updateReactionQuery = `
        UPDATE userreactedonpost
        SET Reaction_Status = 2
        WHERE Post_ID = ? AND User_ID = ?;
      `;

      db.query(updateReactionQuery, [postId, userId], (err, updateResult) => {
        if (err) {
          console.error('Error updating reaction:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Decrease like count in posts table
        const decreaseLikeCountQuery = `
          UPDATE posts
          SET Likes = Likes - 1
          WHERE PostID = ?;
        `;

        db.query(decreaseLikeCountQuery, [postId], (err, updateResult) => {
          if (err) {
            console.error('Error decrementing like count:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          // Increase dislike count in posts table
          const increaseDislikeCountQuery = `
            UPDATE posts
            SET Dislikes = Dislikes + 1
            WHERE PostID = ?;
          `;

          db.query(increaseDislikeCountQuery, [postId], (err, updateResult) => {
            if (err) {
              console.error('Error incrementing dislike count:', err);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Get updated counts
            fetchReactionCounts(postId, res);
          });
        });
      });
    } else {
      // Unreacted or no entry, set reaction status to 2 and increment dislike count
      const insertOrUpdateQuery = `
        INSERT INTO userreactedonpost (Post_ID, User_ID, Reaction_Status)
        VALUES (?, ?, 2)
        ON DUPLICATE KEY UPDATE Reaction_Status = 2;
      `;
      
      db.query(insertOrUpdateQuery, [postId, userId], (err, updateResult) => {
        if (err) {
          console.error('Error disliking post:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Increase dislike count in posts table
        const increaseDislikeCountQuery = `
          UPDATE posts
          SET Dislikes = Dislikes + 1
          WHERE PostID = ?;
        `;

        db.query(increaseDislikeCountQuery, [postId], (err, updateResult) => {
          if (err) {
            console.error('Error incrementing dislike count:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          // Get updated counts
          fetchReactionCounts(postId, res);
        });
      });
    }
  });
});

// Function to fetch like and dislike counts
function fetchReactionCounts(postId, res) {
  const getLikeCountQuery = `
    SELECT Likes
    FROM posts
    WHERE PostID = ?;
  `;

  const getDislikeCountQuery = `
    SELECT Dislikes
    FROM posts
    WHERE PostID = ?;
  `;

  // Fetch like count
  db.query(getLikeCountQuery, [postId], (err, resultLikes) => {
    if (err) {
      console.error('Error fetching like count:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const newLikeCount = resultLikes[0].Likes;

    // Fetch dislike count
    db.query(getDislikeCountQuery, [postId], (err, resultDislikes) => {
      if (err) {
        console.error('Error fetching dislike count:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const newDislikeCount = resultDislikes[0].Dislikes;

      res.json({
        status: 'success',
        action: 'dislike',
        postId: postId,
        newLikeCount: newLikeCount,
        newDislikeCount: newDislikeCount
      });
    });
  });
}

// Start server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});