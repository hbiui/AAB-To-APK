import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FeatureCards } from './components/FeatureCards';
import { UploadZone } from './components/UploadZone';
import { HowItWorks } from './components/HowItWorks';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { ConversionHistory } from './components/ConversionHistory';
import { AuthGate } from './components/AuthGate';

function App() {
  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />
        <main>
          <HeroSection />
          <UploadZone />
          <ConversionHistory />
          <FeatureCards />
          <HowItWorks />
          <FAQ />
        </main>
        <Footer />
      </div>
    </AuthGate>
  );
}

export default App;
