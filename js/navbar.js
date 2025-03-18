// navbar.js - simplified version without modal loading
document.addEventListener('DOMContentLoaded', function() {
    // Create the header HTML with the new structure
    const headerHTML = `
      <header>
          <div class="container-nav">
              <div class="logo">
                  <a href="index.html">
                      <i class="fas fa-exchange-alt"></i>
                      <span>Quiz Converter</span>
                  </a>
              </div>
              <nav>
                  <ul>
                      <li><a href="index.html">Home</a></li>
                      <li><a href="quickConvert.html">Quick Convert</a></li>
                      <li><a href="generateQuestions.html">Generate Questions</a></li>
                      <li><a href="itemBank.html">Item Bank</a></li>
                      <li><a href="qtiToPdf.html">QTI to PDF</a></li>
                  </ul>
              </nav>
              <div class="download-btn">
                  <a href="#" class="btn-download" id="download-template-btn">
                      <i class="fas fa-download"></i> Download Template
                  </a>
              </div>
          </div>
      </header>
    `;
    
    // Insert the header at the beginning of the body
    // Check if there's already a header to avoid duplicates
    if (!document.querySelector('header')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = headerHTML;
      document.body.insertBefore(tempDiv.firstElementChild, document.body.firstChild);
    }
    
    // Highlight the active page based on the current URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
      }
    });
  });