import Logo from "../components/Logo";
import StatusRegion from "../components/StatusRegion";

export default function Home() {
  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Logo className="app-header__logo" />
          <h1 className="app-header__title">AI Study Buddy</h1>
        </div>
      </header>
      <main className="page">
        <section aria-label="Opplasting og innstillinger" />
        <section aria-label="Resultater" />
      </main>
      <StatusRegion />
    </>
  );
}
