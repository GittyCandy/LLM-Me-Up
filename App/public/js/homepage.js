function initParticles() {
  try {
    // Get current theme to set initial colors
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const particleColor = currentTheme === 'dark' ? 'rgba(245, 66, 102, 0.5)' : '#f54266';

particlesJS('particles-js', {
  "particles": {
    "number": {
      "value": 100,  // Balanced number for good visibility
      "density": {
        "enable": true,
        "value_area": 900
      }
    },
    "color": {
      "value": "#f54266",
      "animation": {
        "enable": true,
        "speed": 15,
        "sync": false
      }
    },
    "shape": {
      "type": ["polygon"],  // Two shapes for variety
      "stroke": {
        "width": 1,
        "color": "#f54266"
      },
      "polygon": {
        "nb_sides": 6
      }
    },
    "opacity": {
      "value": 0.1,
      "random": true,
      "anim": {
        "enable": true,
        "speed": 1,
        "opacity_min": 0.1,
        "sync": false
      }
    },
    "size": {
      "value": 3.5,
      "random": true,
      "anim": {
        "enable": true,
        "speed": 2,
        "size_min": 0.3,
        "sync": false
      }
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#f54266",
      "opacity": 0.55,
      "width": 1,
      "shadow": {
        "enable": true,
        "color": "#000000",
        "blur": 3
      }
    },
    "move": {
      "enable": true,
      "speed": 1.2,
      "direction": "none",
      "random": true,
      "straight": false,
      "out_mode": "bounce",
      "bounce": true,
      "attract": {
        "enable": true,
        "rotateX": 600,
        "rotateY": 1200
      }
    }
  },
  "interactivity": {
    "detect_on": "window",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "repulse",  // Changed to repulse on hover
        "parallax": {
          "enable": false  // Disabled parallax since we're using repulse
        }
      },
      "onclick": {
        "enable": true,
        "mode": "bubble"  // Changed click to bubble effect
      },
      "resize": true
    },
    "modes": {
      "repulse": {  // Strong repulse configuration
        "distance": 100,
        "duration": 0.5,
        "speed": 1
      },
      "bubble": {
        "distance": 200,
        "size": 4,
        "duration": 0.7,
        "opacity": 0.2,
        "speed": 3
      },
      "grab": {
        "distance": 100,
        "line_linked": {
          "opacity": 0.7
        }
      }
    }
  },
  "retina_detect": true
});
  } catch (e) {
    console.error("Particles.js initialization error:", e);
    // Retry after delay if failed
    setTimeout(initParticles, 500);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Load particles.js first if not already loaded
  if (typeof particlesJS !== 'undefined') {
    initParticles();
  } else {
    // Fallback in case particles.js loads after DOMContentLoaded
    const checkParticlesLoaded = setInterval(() => {
      if (typeof particlesJS !== 'undefined') {
        clearInterval(checkParticlesLoaded);
        initParticles();
      }
    }, 100);
  }

  // Animate elements on scroll
  const animateOnScroll = function() {
    const elements = document.querySelectorAll('.agent-card, .feature-card');

    elements.forEach(element => {
      const elementPosition = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (elementPosition < windowHeight - 100) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }
    });
  };

  // Set initial state for animation
  const agentCards = document.querySelectorAll('.agent-card');
  const featureCards = document.querySelectorAll('.feature-card');

  agentCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
  });

  featureCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
  });

  // Run once on load
  animateOnScroll();

  // Then run on scroll
  window.addEventListener('scroll', animateOnScroll);

  // Add ripple effect to buttons
  const buttons = document.querySelectorAll('.btn');

  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Prevent button from growing on click
      e.preventDefault();

      const x = e.clientX - e.target.getBoundingClientRect().left;
      const y = e.clientY - e.target.getBoundingClientRect().top;

      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      this.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 1000);
    });
  });

  // Add hover effect to agent cards
  const agentCardsAll = document.querySelectorAll('.agent-card');

  agentCardsAll.forEach(card => {
    card.addEventListener('mousemove', function(e) {
      const x = e.clientX - e.target.getBoundingClientRect().left;
      const y = e.clientY - e.target.getBoundingClientRect().top;

      const centerX = this.offsetWidth / 2;
      const centerY = this.offsetHeight / 2;

      const angleX = (y - centerY) / 10;
      const angleY = (centerX - x) / 10;

      this.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) translateY(-5px)`;
    });

    card.addEventListener('mouseleave', function() {
      this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(-5px)';
    });
  });
});

// Dark Mode Functionality
const themeToggle = document.querySelector('.theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Check for saved theme or use preferred color scheme
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (prefersDarkScheme.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}


// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Initialize theme on load
initializeTheme();

// Add event listener
themeToggle.addEventListener('click', toggleTheme);

// Watch for system theme changes
prefersDarkScheme.addEventListener('change', e => {
  if (!localStorage.getItem('theme')) {
    const newTheme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
  }
});
