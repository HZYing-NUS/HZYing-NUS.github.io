import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  token.attrSet('rel', 'ugc nofollow noreferrer');
  const href = token.attrGet('href') || '';
  if (/^https?:\/\//i.test(href)) token.attrSet('target', '_blank');
  return renderer.renderToken(tokens, index, options);
};
markdown.validateLink = (url) => /^(?:https?:|mailto:|\/|#)/i.test(url);

export function CommunitySafeMarkdown({ content }: { content: string }) {
  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: markdown.render(content) }}
    />
  );
}
