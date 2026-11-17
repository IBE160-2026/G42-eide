import { AppStatusProvider } from "../components/AppStatusProvider";
import DemoBanner from "../components/DemoBanner";
import DemoControls from "../components/DemoControls";
import DemoOutcome from "../components/DemoOutcome";
import { DemoProvider } from "../components/DemoProvider";
import Logo from "../components/Logo";
import StartupCheck from "../components/StartupCheck";
import StatusRegion from "../components/StatusRegion";

export default function Home() {
  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Logo className="app-header__logo" />
          <h1 id="app-title" tabIndex={-1} className="app-header__title">
            AI Study Buddy
          </h1>
        </div>
      </header>
      <AppStatusProvider>
        <DemoProvider>
          <main className="page">
            <DemoBanner />
            <section aria-label="Opplasting og innstillinger">
              <DemoControls />
            </section>
            <section aria-label="Resultater">
              <StartupCheck />
              <DemoOutcome />
            </section>
          </main>
        </DemoProvider>
      </AppStatusProvider>
      <StatusRegion />
    </>
  );
}
