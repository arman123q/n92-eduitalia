export default function Footer() {
  return (
    <footer className="bg-[#0b2e27] text-[#faf9f5]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <span className="inline-block rounded-xl bg-white p-1.5">
            <img src="/logo.jpg" alt="N92 Edu-Italia logo" className="h-12 w-auto" width="96" height="48" />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-[#faf9f5]/75">
            Personalised guidance for Indian students planning higher education in Italy — universities,
            scholarships, applications and visas, explained honestly.
          </p>
        </div>
        <nav aria-label="Explore">
          <h3 className="font-display text-lg font-bold text-[#e7d3a1]">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#faf9f5]/85">
            <li><a className="hover:underline" href="/eligibility/">Check My Eligibility</a></li>
            <li><a className="hover:underline" href="/study-in-italy/">Study in Italy</a></li>
            <li><a className="hover:underline" href="/universities/">Universities</a></li>
            <li><a className="hover:underline" href="/courses/">Courses</a></li>
            <li><a className="hover:underline" href="/scholarships/">Scholarships</a></li>
            <li><a className="hover:underline" href="/calculator/">Cost Calculator</a></li>
            <li><a className="hover:underline" href="/process/">Application Process</a></li>
            <li><a className="hover:underline" href="/visa-guide/">Visa Guide</a></li>
            <li><a className="hover:underline" href="/faq/">FAQ</a></li>
            <li><a className="hover:underline" href="/privacy/">Privacy Notice</a></li>
            <li><a className="hover:underline" href="/terms/">Terms of Use</a></li>
          </ul>
        </nav>
        <nav aria-label="Official sources">
          <h3 className="font-display text-lg font-bold text-[#e7d3a1]">Official Sources</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#faf9f5]/85">
            <li><a className="hover:underline" href="https://www.universitaly.it/" target="_blank" rel="noopener noreferrer">Universitaly — Ministry portal</a></li>
            <li><a className="hover:underline" href="https://www.esteri.it/en/" target="_blank" rel="noopener noreferrer">Italian Ministry of Foreign Affairs</a></li>
            <li><a className="hover:underline" href="https://ambnewdelhi.esteri.it/en/" target="_blank" rel="noopener noreferrer">Embassy of Italy in New Delhi</a></li>
            <li><a className="hover:underline" href="https://education.ec.europa.eu/" target="_blank" rel="noopener noreferrer">EU — Education & Training</a></li>
          </ul>
        </nav>
        <div id="contact">
          <h3 className="font-display text-lg font-bold text-[#e7d3a1]">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#faf9f5]/85">
            <li>
              WhatsApp:{" "}
              <a className="underline font-semibold" href="https://wa.me/919452532786" target="_blank" rel="noopener noreferrer">
                +91 94525 32786
              </a>
            </li>
            <li>
              Instagram:{" "}
              <a className="underline font-semibold" href="https://www.instagram.com/n92eduitalia/" target="_blank" rel="noopener noreferrer">
                @n92eduitalia
              </a>
            </li>
            <li>Intake focus: 2027–28</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 text-[0.8rem] leading-relaxed text-[#faf9f5]/60">
          <p>
            N92 Edu-Italia provides study guidance only. Admission, scholarship and visa decisions are made solely by
            universities, regional scholarship agencies and Italian authorities. Always verify requirements,
            deadlines and fees on official sources. Nothing on this website guarantees admission, funding or a visa.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} N92 Edu-Italia. All rights reserved.</p>
        </div>
      </div>
      <div className="tricolour-bar" aria-hidden="true" />
    </footer>
  );
}
