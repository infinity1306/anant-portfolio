import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Works from './components/Works';
import Philosophy from './components/Philosophy';
import Footer from './components/Footer';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-red-500 selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Works />
        <Philosophy />
      </main>
      <Footer />
    </div>
  );
};

export default App;
