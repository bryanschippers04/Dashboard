import Link from 'next/link'
import TopNav from '@/components/TopNav'

export const metadata = {
  title: 'Terms — Personal OS',
  description: 'Terms of use for the Personal OS dashboard.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-12 md:px-5 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">{'// '}</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">TERMS</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Terms of Use</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
          <p className="text-[10px] text-zinc-600 tracking-wider mt-2">Last updated: 27 May 2026</p>
        </div>

        <article className="text-sm text-zinc-300 leading-relaxed space-y-5">
          <Section title="About this service">
            <p>
              Personal OS is a self-hosted personal dashboard for a single individual. It is not
              offered as a service to third parties and has no commercial purpose. Source code
              and configuration are private to the operator.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>
              The application is operated solely for the account holder&rsquo;s own use. It will
              not be used to access data belonging to any other person, business, or organisation.
              Bank account access is limited to the account holder&rsquo;s own consented accounts.
            </p>
          </Section>

          <Section title="No warranty">
            <p>
              The application is provided &ldquo;as is&rdquo; without warranty of any kind.
              There is no guarantee of uptime, accuracy of insights, completeness of transaction
              data, or fitness for any particular purpose. Decisions based on data shown in this
              dashboard are the account holder&rsquo;s sole responsibility.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>
              The application relies on third-party providers (Supabase, Vercel, Enable Banking,
              Anthropic). Their respective terms and privacy policies apply to any data they
              process. Their availability is outside the operator&rsquo;s control.
            </p>
          </Section>

          <Section title="Liability">
            <p>
              The operator accepts no liability for any loss or damage arising from use or
              inability to use this application, including but not limited to data loss,
              incorrect insights, or interruptions to third-party services.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              These terms may be updated as the project evolves. Material changes will be dated
              at the top of this page.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms can be sent to{' '}
              <a href="mailto:bryanschippers.bs@gmail.com" className="text-accent hover:underline">
                bryanschippers.bs@gmail.com
              </a>.
            </p>
          </Section>
        </article>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] text-zinc-500 tracking-[0.2em] uppercase mb-2">{title}</h2>
      <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
    </section>
  )
}
