// modal.js - with separate templates for Item Bank and Quick Convert
document.addEventListener('DOMContentLoaded', function() {
    console.log("Modal.js loaded");
    
    // Create the modal HTML with both template options
    const modalHTML = `
      <div id="download-modal" class="modal">
          <div class="modal-overlay"></div>
          <div class="download-card">
              <div class="modal-close">&times;</div>
              <h2>Download Quiz Templates</h2>
              <p>Choose your preferred template format</p>
              
              <div class="template-section">
                  <h3>Item Bank Template</h3>
                  <div class="download-options">
                      <a href="https://docs.google.com/spreadsheets/d/1q1uWXuw15KWtMrYEIAx_gU_0gvzk0yqMCt1iewDCpnw/edit?usp=sharing" class="download-btn-large" target="_blank">
                          <i class="fab fa-google-drive"></i>
                          <span class="btn-text">Google Sheet</span>
                      </a>
                      
                      <a href="../templates/ItemBankTemplate.xlsx" class="download-btn-large" download>
                          <i class="far fa-file-excel"></i>
                          <span class="btn-text">Excel/CSV</span>
                      </a>
                  </div>
              </div>
              
              <div class="template-divider"></div>
              
              <div class="template-section">
                  <h3>Quick Convert Template</h3>
                  <div class="download-options">
                      <a href="https://docs.google.com/spreadsheets/d/1jxbXah5UG_QmWFiI5Z5AqK6QPvBBhmmtYPXawh0wu6A/edit?usp=sharing" class="download-btn-large" target="_blank">
                          <i class="fab fa-google-drive"></i>
                          <span class="btn-text">Google Sheet</span>
                      </a>
                      
                      <a href="../templates/QuickConvertTemplate.xlsx" class="download-btn-large" download>
                          <i class="far fa-file-excel"></i>
                          <span class="btn-text">Excel/CSV</span>
                      </a>
                  </div>
              </div>
          </div>
      </div>
    `;
    
    // Add the modal to the end of the body
    if (!document.getElementById('download-modal')) {
      console.log("Injecting modal HTML");
      const modalDiv = document.createElement('div');
      modalDiv.innerHTML = modalHTML;
      document.body.appendChild(modalDiv.firstElementChild);
    }
    
    // Use setTimeout to ensure the button is available (since navbar.js runs at the same time)
    setTimeout(function() {
      // Set up event listeners
      const downloadBtn = document.getElementById('download-template-btn');
      const modal = document.getElementById('download-modal');
      const modalOverlay = document.querySelector('.modal-overlay');
      const modalClose = document.querySelector('.modal-close');
      
      if (downloadBtn && modal) {
        // Open modal when button is clicked
        downloadBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log("Download button clicked");
          modal.classList.add('active');
          document.body.classList.add('modal-open');
        });
        
        // Close modal when X is clicked
        if (modalClose) {
          modalClose.addEventListener('click', function() {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
          });
        }
        
        // Close modal when overlay is clicked
        if (modalOverlay) {
          modalOverlay.addEventListener('click', function() {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
          });
        }
        
        // Close modal when ESC key is pressed
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
          }
        });
        
        // Track downloads (optional)
        const downloadBtnsLarge = document.querySelectorAll('.download-btn-large');
        downloadBtnsLarge.forEach(btn => {
          btn.addEventListener('click', function() {
            const type = this.querySelector('.btn-text').textContent;
            const templateType = this.closest('.template-section').querySelector('h3').textContent;
            console.log(`Template downloaded: ${templateType} - ${type}`);
          });
        });
      }
    }, 100); // Small delay to ensure navbar.js has completed
  });