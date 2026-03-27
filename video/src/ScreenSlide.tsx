import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import React from 'react';

interface ScreenSlideProps {
    imageSrc: string;
    title: string;
    description: string;
    color?: string;
}

export const ScreenSlide: React.FC<ScreenSlideProps> = ({ 
    imageSrc, 
    title, 
    description,
    color = '#4caf50' 
}) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const opacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const scale = spring({
        frame,
        fps,
        config: { damping: 200 },
        from: 0.9,
        to: 1
    });

    const translateY = interpolate(frame, [0, 30], [50, 0], {
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill style={{ backgroundColor: '#111' }}>
            {/* Background Image with blur */}
            <AbsoluteFill style={{ opacity: 0.3 }}>
                <Img 
                    src={imageSrc} 
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(20px)'
                    }}
                />
            </AbsoluteFill>

            {/* Main Content */}
            <AbsoluteFill style={{ 
                justifyContent: 'center', 
                alignItems: 'center',
                opacity,
                transform: `scale(${scale})`
            }}>
                <div style={{
                    width: '90%',
                    height: '80%',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: `1px solid ${color}40`,
                    position: 'relative'
                }}>
                    <Img 
                        src={imageSrc} 
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            backgroundColor: '#1e1e1e'
                        }}
                    />
                </div>
            </AbsoluteFill>

            {/* Text Overlay */}
            <AbsoluteFill style={{ 
                justifyContent: 'flex-end', 
                padding: 60,
                alignItems: 'center'
            }}>
                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: '30px 60px',
                    borderRadius: 40,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    transform: `translateY(${translateY}px)`,
                    opacity,
                    textAlign: 'center'
                }}>
                    <h1 style={{ 
                        color: '#fff', 
                        margin: '0 0 10px 0',
                        fontSize: 48,
                        fontWeight: 800
                    }}>{title}</h1>
                    <p style={{ 
                        color: '#aaa', 
                        margin: 0,
                        fontSize: 24,
                        fontWeight: 500 
                    }}>{description}</p>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
