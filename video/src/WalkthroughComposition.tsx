import { Sequence, useVideoConfig } from 'remotion';
import { ScreenSlide } from './ScreenSlide';
import React from 'react';

// Require images via Webpack/Remotion handling to ensure bundle inclusion
// In a real scenario we might dynamic import, but static require is reliable for Remotion
const mainCard = require('../../assets/screenshots/main-card.png');
const plantOverview = require('../../assets/screenshots/plant-overview-tab.png');
const timeline = require('../../assets/screenshots/plant-timeline-tab.png');
const library = require('../../assets/screenshots/strain-library.png');
const mobile = require('../../assets/screenshots/mobile-view.png');

export const WalkthroughComposition: React.FC = () => {
    const { fps } = useVideoConfig(); // use `fps`

    // Define scenes
    const scenes = [
        {
            image: mainCard,
            title: "Dashboard Overview",
            description: "Monitor your entire grow operation at a glance.",
            duration: 150 // 5 seconds
        },
        {
            image: plantOverview,
            title: "Detailed Plant Tracking",
            description: "Track every vital metric for individual plants.",
            duration: 150
        },
        {
            image: timeline,
            title: "Growth Timeline",
            description: "Visualize lifecycle progress from seed to harvest.",
            duration: 150
        },
        {
            image: library,
            title: "Strain Library",
            description: "Manage your genetics database with ease.",
            duration: 150
        },
        {
            image: mobile,
            title: "Fully Responsive",
            description: "Manage your grow from any device, anywhere.",
            duration: 150
        }
    ];

    let currentFrame = 0;

    return (
        <div style={{ flex: 1, backgroundColor: 'black' }}>
            {scenes.map((scene, index) => {
                const start = currentFrame;
                currentFrame += scene.duration;
                
                return (
                    <Sequence 
                        key={index} 
                        from={start} 
                        durationInFrames={scene.duration}
                    >
                        <ScreenSlide 
                            imageSrc={scene.image}
                            title={scene.title}
                            description={scene.description}
                        />
                    </Sequence>
                );
            })}
        </div>
    );
};
