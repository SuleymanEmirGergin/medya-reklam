// Moved out of iletisim.html so the CSP can forbid inline scripts.
document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('contact-parallax-section');
  const leftCol = document.getElementById('contact-left');
  const rightCol = document.getElementById('contact-right');
  const mapSection = document.getElementById('map-section');
  
  function updateParallax() {
    const rect = section.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Progress goes from 0 (section enters bottom of screen) 
    // to 1 (section leaves top of screen)
    const totalDistance = windowHeight + rect.height;
    const scrolled = windowHeight - rect.top;
    let progress = scrolled / totalDistance;
    
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    
    // Normalized goes from -0.5 to 0.5. At 0, elements are perfectly centered.
    const normalized = progress - 0.5;
    
    const moveAmount = 80; // Subtle pixel movement distance from center
    
    // Left column moves UP: negative transform as progress increases
    const leftY = -(normalized * moveAmount * 2);
    
    // Right column moves DOWN: positive transform as progress increases
    const rightY = (normalized * moveAmount * 2);
    
    leftCol.style.transform = `translateY(${leftY}px)`;
    rightCol.style.transform = `translateY(${rightY}px)`;
    
    // Soft Map Reveal
    // Show map when we are almost done scrolling past the contact section
    if (progress > 0.4 || rect.bottom < windowHeight + 200) {
      mapSection.classList.add('is-visible');
    } else {
      mapSection.classList.remove('is-visible');
    }
    
    requestAnimationFrame(updateParallax);
  }
  
  requestAnimationFrame(updateParallax);
});
