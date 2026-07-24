import Image from "next/image";
import { HealingRoom } from "./components/HealingRoom";

export default function Home() {
  return (
    <>
      <main className="landing">
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="brand" href="#" aria-label="NewChapter home">
            <span className="brand-mark" aria-hidden="true" />
            NewChapter
          </a>
          <a className="nav-cta" href="#healing-room">
            Enter your space
          </a>
        </nav>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image" role="img" aria-label="A quiet room opening onto a hopeful dawn" />
          <div className="hero-shade" />
          <div className="hero-copy">
            <span className="eyebrow">For the space after goodbye</span>
            <h1 id="hero-title">
              You don’t have to
              <br />
              heal all at once.
            </h1>
            <p>
              A private AI companion for heartbreak—here to listen, steady the
              moment, and help you find one kind next step.
            </p>
            <div className="hero-actions">
              <a className="primary-cta" href="#healing-room">
                Begin a reflection <span aria-hidden="true">↘</span>
              </a>
              <span>Free text support · 3 live sessions daily</span>
            </div>
          </div>
          <div className="hero-note">
            <span>01</span>
            <p>Share what hurts. Move forward at your own pace.</p>
          </div>
        </section>

        <section className="what-section" aria-labelledby="what-title">
          <span className="section-number">What is NewChapter?</span>
          <h2 id="what-title">A softer place to make sense of a hard ending.</h2>
          <div className="what-grid">
            <article>
              <span>Listen</span>
              <p>Say the part you keep replaying.</p>
            </article>
            <article>
              <span>Ground</span>
              <p>Slow the spiral in the moment.</p>
            </article>
            <article>
              <span>Move</span>
              <p>Choose one manageable next step.</p>
            </article>
          </div>
          <p className="boundary-copy">
            Emotional support, not therapy or emergency care.
          </p>
        </section>

        <section className="meet-section" aria-labelledby="meet-title">
          <div className="meet-copy">
            <span className="eyebrow">Meet your AI video companion</span>
            <h2 id="meet-title">Sometimes it helps to say it out loud.</h2>
            <p>
              Talk it through with Aadhi in a calm, face-to-face AI video
              conversation—without judgment or pressure.
            </p>
            <a className="primary-cta" href="#healing-room">
              Meet Aadhi <span aria-hidden="true">↘</span>
            </a>
            <small>Three private, three-minute video sessions daily.</small>
          </div>
          <figure className="aadhi-preview">
            <Image
              src="/aadhi-video-preview.png"
              alt="Preview of the Aadhi AI video companion conversation screen"
              width={1347}
              height={652}
              sizes="(max-width: 760px) 100vw, 62vw"
            />
            <figcaption>
              Aadhi is an AI avatar, not a human counsellor.
            </figcaption>
          </figure>
        </section>
      </main>
      <div id="healing-room">
        <HealingRoom />
      </div>
    </>
  );
}
