export default function PageIntro({ eyebrow, title, description }) {
  return <section className="page-intro"><div className="container">
    <span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>
  </div></section>;
}
