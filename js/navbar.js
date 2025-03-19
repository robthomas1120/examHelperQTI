// navbar.js - with download button inside the burger menu for all responsive sizes
document.addEventListener('DOMContentLoaded', function() {
  // Create the header HTML with positioning adjustments
  const headerHTML = `
    <header>
        <div class="container-nav">
            <div class="left-section">
                <div class="logo-nav">
                    <a href="index.html">
                        <img src="../ustlogo.png" alt="UST Logo" class="logo-img">
                        <span>ExamHelper</span>
                    </a>
                </div>
            </div>
            
            <nav class="nav-menu">
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="quickConvert.html">Quick Convert</a></li>
                    <li><a href="generateQuestions.html">Generate Questions</a></li>
                    <li><a href="itemBank.html">Item Bank</a></li>
                    <li><a href="qtiToPdf.html">QTI to PDF</a></li>
                    <li class="mobile-download-item">
                        <a href="#" class="mobile-download-btn" id="mobile-download-template-btn">
                            <i class="fas fa-download"></i> Download Template
                        </a>
                    </li>
                </ul>
            </nav>
            
            <div class="right-section">
                <div class="hamburger-menu">
                    <div class="hamburger-icon">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <!-- Desktop download button only visible on large screens -->
                <div class="download-btn desktop-only">
                    <a href="#" class="btn-download" id="download-template-btn">
                        <i class="fas fa-download"></i> Download Template
                    </a>
                </div>
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
  const navLinks = document.querySelectorAll('nav a');
  
  navLinks.forEach(link => {
    // Skip the download button when adding active class
    if (link.getAttribute('href') === currentPage && !link.classList.contains('mobile-download-btn')) {
      link.classList.add('active');
    }
  });

  // Toggle mobile menu functionality
  const hamburgerMenu = document.querySelector('.hamburger-icon');
  const navMenu = document.querySelector('.nav-menu');
  
  if (hamburgerMenu) {
    hamburgerMenu.addEventListener('click', function() {
      this.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }

  // Close menu when clicking a link (mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Don't close menu when clicking download in mobile view
      if (!link.classList.contains('mobile-download-btn')) {
        hamburgerMenu.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  });

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

  // Add responsive CSS styles
  if (!document.getElementById('navbar-responsive-styles')) {
    const navStyles = document.createElement('style');
    navStyles.id = 'navbar-responsive-styles';
    navStyles.textContent = `
      /* Responsive Navbar Styles */
      .container-nav {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
      }
      
      .left-section {
          margin-right: auto; /* Push to the far left */
      }
      
      .right-section {
          margin-left: auto; /* Push to the far right */
          display: flex;
          align-items: center;
      }
      
      /* Logo styles */
      .logo-nav a {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: var(--primary-color);
          font-weight: bold;
          font-size: 1.2rem;
      }
      
      .logo-img {
          height: 35px;
          margin-right: 10px;
      }
      
      /* Navigation menu styles */
      .nav-menu {
          display: flex;
          justify-content: center;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
      }
      
      .nav-menu ul {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
      }
      
      .nav-menu li {
          margin: 0 10px;
      }
      
      .nav-menu a {
          text-decoration: none;
          color: var(--nav-text-color, #fff);
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 5px;
          transition: all 0.3s ease;
          display: block;
      }
      
      .nav-menu a:hover {
          color: var(--primary-color);
          background-color: var(--nav-hover-bg, rgba(255, 184, 28, 0.2));
      }
      
      .nav-menu a.active {
          color: var(--primary-color);
          background-color: var(--nav-active-bg, rgba(255, 184, 28, 0.3));
      }
      
      /* Hamburger Menu Styles */
      .hamburger-menu {
          display: none;
          cursor: pointer;
          z-index: 1000;
          margin-right: 15px;
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
          background-color: var(--primary-color);
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
      
      /* Download Button Styles */
      .download-btn {
          margin-left: 20px;
      }
      
      .btn-download {
          display: inline-block;
          background-color: var(--primary-color);
          color: var(--nav-bg-color, #121212);
          padding: 8px 16px;
          border-radius: 5px;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
      }
      
      .btn-download:hover {
          background-color: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(255, 184, 28, 0.4);
      }
      
      .btn-download i {
          margin-right: 8px;
      }
      
      /* Mobile download button styles */
      .mobile-download-item {
          display: none;
      }
      
      .mobile-download-btn {
          display: flex;
          align-items: center;
          background-color: var(--primary-color);
          color: var(--nav-bg-color, #121212) !important;
          padding: 10px 15px !important;
          border-radius: 5px;
          font-weight: 500;
          margin-top: 20px;
          justify-content: center;
      }
      
      .mobile-download-btn i {
          margin-right: 10px;
      }
      
      .mobile-download-btn:hover {
          background-color: var(--primary-dark) !important;
      }
      
      /* Footer Styles */
      footer {
          background-color: #121212; /* Black background to match navbar */
          color: #6c757d; /* Light gray text for subtle footer content */
          padding: 20px 0;
          text-align: center;
          width: 100%;
          margin-top: auto; /* Pushes footer to bottom if using flex on body */
      }

      footer .copyright {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6); /* Slightly transparent white */
          font-weight: 400;
      }

      /* Layout styles */
      body {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
      }

      main {
          flex: 1;
      }
      
      /* Media Queries for Responsive Design */
      @media screen and (max-width: 992px) {
          .nav-menu {
              position: fixed;
              top: 0;
              right: -100%;
              width: 250px;
              height: 100vh;
              background-color: var(--nav-bg-color, #121212);
              box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
              padding-top: 80px;
              transition: all 0.4s ease;
              z-index: 100;
              transform: none;
              left: auto;
          }
          
          .nav-menu.active {
              right: 0;
          }
          
          .nav-menu ul {
              flex-direction: column;
              padding: 0 20px;
          }
          
          .nav-menu li {
              margin: 15px 0;
          }
          
          .hamburger-menu {
              display: flex;
          }
          
          /* Show download button in mobile menu for tablet sizes */
          .mobile-download-item {
              display: block;
          }
          
          /* Hide desktop download button in tablet view */
          .desktop-only {
              display: none;
          }
      }
      
      @media screen and (max-width: 768px) {
          .nav-menu {
              width: 100%;
              padding-top: 70px;
          }
          
          .logo-img {
              height: 30px;
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
    document.head.appendChild(navStyles);
  }
});