document.addEventListener('DOMContentLoaded', function() {
    // Create the header HTML with a three-column layout
    const headerHTML = `
      <header>
          <div class="container-nav">
              <!-- Left: Logo -->
              <div class="logo-nav">
                  <a href="index.html">
                  <img src="../images/edtech.png" alt="UST Logo" class="edlogo-img">
                      <img src="../images/ustlogo.png" alt="UST Logo" class="logo-img">
                     <span class="white-text">Ed</span>STAR<span class="white-text">Helper</span>
                  </a>
              </div>
              
              <!-- Center: Navigation menu -->
              <nav class="nav-menu">
                  <ul>
                      <li><a href="index.html">Home</a></li>
                      <li><a href="quickConvert.html">Quick Convert</a></li>
                      <li><a href="generateQuestions.html">Generate Questions</a></li>
                      <li><a href="itemBank.html">Item Bank</a></li>
                      <li><a href="qtiToPdf.html">QTI to PDF</a></li>
                  </ul>
              </nav>
              
              <!-- Right: Controls group (download button and hamburger) -->
              <div class="controls-group">
                  <!-- Download button -->
                  <div class="download-btn">
                      <a href="#" class="btn-download" id="download-template-btn">
                          <i class="fas fa-download"></i> Download Template
                      </a>
                  </div>
                  
                  <!-- Mobile menu button (hidden on desktop) -->
                  <div class="hamburger-menu">
                      <div class="hamburger-icon">
                          <span></span>
                          <span></span>
                          <span></span>
                      </div>
                  </div>
              </div>
              
              <!-- Mobile navigation (hidden initially) -->
              <div class="mobile-nav">
                  <div class="close-btn">
                      <div class="close-icon">
                          <span></span>
                          <span></span>
                      </div>
                  </div>
                  <ul>
                      <li><a href="index.html">Home</a></li>
                      <li><a href="quickConvert.html">Quick Convert</a></li>
                      <li><a href="generateQuestions.html">Generate Questions</a></li>
                      <li><a href="itemBank.html">Item Bank</a></li>
                      <li><a href="qtiToPdf.html">QTI to PDF</a></li>
                      <li>
                          <a href="#" class="mobile-download-btn" id="mobile-download-template-btn">
                              <i class="fas fa-download"></i> Download Template
                          </a>
                      </li>
                  </ul>
              </div>
          </div>
      </header>
    `;
    
    // Create the footer HTML
    const footerHTML = `
      <footer>
          <p class="copyright">Exam Helper by STAR EdTech Interns 2025</p>
      </footer>
    `;
    
    // Insert the header at the beginning of the body
    if (!document.querySelector('header')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = headerHTML;
      document.body.insertBefore(tempDiv.firstElementChild, document.body.firstChild);
    }
    
    // Insert the footer at the end of the body
    if (!document.querySelector('footer')) {
      const footerDiv = document.createElement('div');
      footerDiv.innerHTML = footerHTML;
      document.body.appendChild(footerDiv.firstElementChild);
    }
    
    // Highlight the active page based on the current URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-menu a, .mobile-nav a');
    
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentPage && !link.classList.contains('mobile-download-btn')) {
        link.classList.add('active');
      }
    });
  
    // Toggle mobile menu functionality
    const hamburgerMenu = document.querySelector('.hamburger-icon');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (hamburgerMenu) {
      hamburgerMenu.addEventListener('click', function() {
        this.classList.toggle('active');
        mobileNav.classList.toggle('active');
      });
    }
  
    // Close menu when clicking a link (mobile)
    const mobileNavLinks = document.querySelectorAll('.mobile-nav a');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (!link.classList.contains('mobile-download-btn')) {
          hamburgerMenu.classList.remove('active');
          mobileNav.classList.remove('active');
        }
      });
    });
  
    // Add close button functionality
    const closeButton = document.querySelector('.close-btn');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        hamburgerMenu.classList.remove('active');
        mobileNav.classList.remove('active');
      });
    }
  
    // Ensure both download buttons have the same functionality
    const desktopDownloadBtn = document.getElementById('download-template-btn');
    const mobileDownloadBtn = document.getElementById('mobile-download-template-btn');
    
    // Function to handle download template click
    const handleDownloadClick = (e) => {
      e.preventDefault();
      // Add your download template logic here
      console.log('Download template clicked');
      // Example: window.location.href = 'template.xlsx';
    };
    
    // Add event listeners to both buttons
    if (desktopDownloadBtn) {
      desktopDownloadBtn.addEventListener('click', handleDownloadClick);
    }
    
    if (mobileDownloadBtn) {
      mobileDownloadBtn.addEventListener('click', handleDownloadClick);
    }
  
    // Add CSS styles directly
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      /* Reset some default styles */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      /* Basic layout */
      body {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        font-family: Arial, sans-serif;
      }
      
      main {
        flex: 1;
      }
      
      /* Header and navbar styles */
      header {
        background-color: #121212;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        width: 100%;
      }
      
      .container-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 20px;
        max-width: 1400px;
        margin: 0 auto;
      }
      
      /* Left: Logo section */
      .logo-nav {
        display: flex;
        align-items: center;
      }
      
      .logo-nav a {
        display: flex;
        align-items: center;
        text-decoration: none;
        color: #ffb81c;
        font-weight: bold;
        font-size: 1.2rem;
      }
      
      .logo-img {
        height: 50px;
        margin-right: 10px;
      }
      .edlogo-img {
        height: 35px;
        margin-right: 10px;
      }
      /* Center: Navigation menu */
      .nav-menu {
        flex: 1;
        display: flex;
        justify-content: center;
      }
      
      .nav-menu ul {
        display: flex;
        list-style: none;
      }
      
      .nav-menu li {
        margin: 0 8px;
      }
      
      .nav-menu a {
        text-decoration: none;
        color: #ffffff;
        font-weight: 500;
        padding: 8px 12px;
        border-radius: 5px;
        transition: all 0.3s ease;
      }
      
      .nav-menu a:hover {
        color: #ffb81c;
        background-color: rgba(255, 184, 28, 0.2);
      }
      
      .nav-menu a.active {
        color: #ffb81c;
        background-color: rgba(255, 184, 28, 0.3);
      }
      
      /* Right: Controls group */
      .controls-group {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      /* Download button */
      .download-btn {
        display: flex;
        justify-content: flex-end;
      }
      
      .btn-download {
        display: inline-block;
        background-color: #ffb81c;
        color: #121212;
        padding: 8px 16px;
        border-radius: 5px;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.3s ease;
      }
      
      .btn-download:hover {
        background-color: #e6a619;
      }
      
      .btn-download i {
        margin-right: 8px;
      }
      
      /* Mobile navigation styles */
      .hamburger-menu {
        display: none;
        cursor: pointer;
      }
      
      .hamburger-icon {
        width: 30px;
        height: 20px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      
      .hamburger-icon span {
        display: block;
        height: 3px;
        width: 100%;
        background-color: #ffb81c;
        border-radius: 3px;
        transition: all 0.3s ease;
      }
      
      .hamburger-icon.active span:nth-child(1) {
        transform: translateY(8.5px) rotate(45deg);
      }
      
      .hamburger-icon.active span:nth-child(2) {
        opacity: 0;
      }
      
      .hamburger-icon.active span:nth-child(3) {
        transform: translateY(-8.5px) rotate(-45deg);
      }
      
      .mobile-nav {
        display: none;
        position: fixed;
        top: 0;
        right: -100%;
        width: 270px;
        height: 100vh;
        background-color: #121212;
        padding-top: 80px; /* Match navbar height */
        transition: all 0.4s ease;
        z-index: 999;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
      }
      
      .mobile-nav.active {
        right: 0;
      }
      
      .mobile-nav ul {
        list-style: none;
        padding: 0 20px;
      }
      
      .mobile-nav li {
        margin: 20px 0;
      }
      
      .mobile-nav a {
        color: #ffffff;
        text-decoration: none;
        font-size: 1.1rem;
        display: block;
        padding: 8px 12px;
        border-radius: 5px;
      }
      
      .mobile-nav a:hover,
      .mobile-nav a.active {
        color: #ffb81c;
        background-color: rgba(255, 184, 28, 0.2);
      }
      
      .mobile-download-btn {
        background-color: #ffb81c;
        color: #121212 !important;
        text-align: center;
        margin-top: 20px;
      }
      
      .mobile-download-btn i {
        margin-right: 8px;
      }
      
      /* Footer styles */
      footer {
        background-color: #121212;
        padding: 20px 0;
        text-align: center;
        margin-top: auto;
      }
      
      footer .copyright {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.9rem;
      }
      
      /* Media queries for responsive design */
      @media screen and (max-width: 992px) {
        .nav-menu {
          display: none;
        }
        
        .container-nav {
          justify-content: space-between;
        }
        
        .controls-group {
          order: 2;
        }
        
        .hamburger-menu {
          display: block;
        }
        
        .mobile-nav {
          display: block;
        }
      }
          .white-text {
      color: white;
    }
      @media screen and (max-width: 768px) {
        .container-nav {
          padding: 0 15px;
        }
        
        .controls-group {
          gap: 10px;
        }
      }
        
      
      @media screen and (max-width: 480px) {
        .logo-nav span {
          font-size: 1rem;
        }
        
        .logo-img {
          height: 25px;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  });