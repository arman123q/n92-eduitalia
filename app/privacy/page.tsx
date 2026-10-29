export const metadata = { title: "Privacy Notice — N92 Edu-Italia" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="kicker">N92 Edu-Italia</p>
      <h1 className="font-display mt-2 text-4xl font-bold text-[#103f35]">Privacy Notice</h1>
      <div className="mt-6 space-y-5 text-[0.97rem] leading-relaxed text-[#202824]">
        <p>
          <strong>What we collect.</strong> The eligibility assessment runs entirely in your browser — your answers
          are not transmitted to us. Only if you choose to request a personalised review do we ask for your name
          and an email address or WhatsApp number, plus the study preferences needed to respond.
        </p>
        <p>
          <strong>Why.</strong> We use those details only to respond to your enquiry and, if you separately opt in,
          to send occasional study-in-Italy updates. We do not sell personal data, and we never ask for passport
          numbers or financial documents through this website's enquiry form.
        </p>
        <p>
          <strong>Demo build notice.</strong> In the current build stage, the enquiry database is not connected.
          If you submit the review form, your details are stored only in your own browser (local storage) and are
          not sent to N92 Edu-Italia. The form states this again at the point of submission.
        </p>
        <p>
          <strong>Your rights.</strong> You may ask us at any time what details we hold about you and request
          correction or deletion, by messaging us on WhatsApp at +91 94525 32786 or via Instagram @n92eduitalia.
        </p>
        <p>
          <strong>External links.</strong> This site links to official sources such as Universitaly and Italian
          government websites. Their privacy practices are their own.
        </p>
        <p className="text-sm text-[#202824]/60">Last updated: 29 October 2026.</p>
      </div>
    </div>
  );
}
