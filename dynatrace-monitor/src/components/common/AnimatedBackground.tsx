import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedBackground: React.FC = () => {
  const { isDarkTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Effet de particules interactives
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Configuration du canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particules
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      targetOpacity: number;
      connections: number[];
    }
    
    const particles: Particle[] = [];
    const particleCount = 50;
    const connectionDistance = 150;
    const mouseRadius = 100;
    let mouseX = 0;
    let mouseY = 0;
    
    // Créer les particules
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: 0,
        targetOpacity: Math.random() * 0.5 + 0.1,
        connections: []
      });
    }
    
    // Gérer la souris
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    // Animation
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Mettre à jour et dessiner les particules
      particles.forEach((particle, i) => {
        // Mouvement
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Rebondir sur les bords
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        // Interaction avec la souris
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouseRadius) {
          const force = (mouseRadius - distance) / mouseRadius;
          particle.vx += (dx / distance) * force * 0.1;
          particle.vy += (dy / distance) * force * 0.1;
          particle.targetOpacity = 0.8;
        } else {
          particle.targetOpacity = Math.random() * 0.3 + 0.1;
        }
        
        // Transition d'opacité fluide
        particle.opacity += (particle.targetOpacity - particle.opacity) * 0.05;
        
        // Réinitialiser les connexions
        particle.connections = [];
        
        // Vérifier les connexions avec d'autres particules
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx2 = other.x - particle.x;
          const dy2 = other.y - particle.y;
          const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          
          if (distance2 < connectionDistance) {
            particle.connections.push(j);
            
            // Dessiner la connexion
            const opacity = (1 - distance2 / connectionDistance) * 0.3;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = isDarkTheme 
              ? `rgba(99, 102, 241, ${opacity})`
              : `rgba(99, 102, 241, ${opacity * 0.6})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
        
        // Dessiner la particule
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDarkTheme 
          ? `rgba(99, 102, 241, ${particle.opacity})`
          : `rgba(99, 102, 241, ${particle.opacity * 0.7})`;
        ctx.fill();
        
        // Effet de lueur pour les particules proches de la souris
        if (distance < mouseRadius) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
          const glowOpacity = (1 - distance / mouseRadius) * 0.2;
          ctx.fillStyle = isDarkTheme 
            ? `rgba(99, 102, 241, ${glowOpacity})`
            : `rgba(99, 102, 241, ${glowOpacity * 0.5})`;
          ctx.fill();
        }
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [isDarkTheme]);
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Canvas pour les particules */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 opacity-50"
        style={{ mixBlendMode: isDarkTheme ? 'screen' : 'multiply' }}
      />
      
      {/* Gradient animé de fond */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: isDarkTheme
            ? [
                'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 100%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)'
              ]
            : [
                'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 100%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)'
              ]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Orbes flottantes */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-96 h-96 rounded-full ${
              isDarkTheme 
                ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10' 
                : 'bg-gradient-to-br from-indigo-300/5 to-purple-300/5'
            } blur-3xl`}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight 
            }}
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight
              ],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 30 + i * 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
      
      {/* Grille futuriste subtile */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(${isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Effet de vagues */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <defs>
          <pattern id="wave-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <motion.path
              d="M0,100 Q50,80 100,100 T200,100"
              stroke={isDarkTheme ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)"}
              strokeWidth="0.5"
              fill="none"
              animate={{
                d: [
                  "M0,100 Q50,80 100,100 T200,100",
                  "M0,100 Q50,120 100,100 T200,100",
                  "M0,100 Q50,80 100,100 T200,100"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wave-pattern)" />
      </svg>
    </div>
  );
};

export default AnimatedBackground;