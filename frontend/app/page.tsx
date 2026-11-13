import { AppStatusProvider } from "../components/AppStatusProvider";
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
        <main className="page">
          <section aria-label="Opplasting og innstillinger" />
          <section aria-label="Resultater">
            <StartupCheck />
          </section>
        </main>
      </AppStatusProvider>
      <StatusRegion />
    </>
  );
}
