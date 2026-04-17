interface Props {
  title: string;
  url: string;
  snippet: string;
}

export default function SearchResultCard({ title, url, snippet }: Props) {
  let domain = url;
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // ignore — url string is fine as-is
  }

  return (
    <a className="search-result" href={url} target="_blank" rel="noopener noreferrer">
      <div className="search-result-domain">{domain}</div>
      <div className="search-result-title">{title}</div>
      <div className="search-result-snippet">{snippet}</div>
    </a>
  );
}
