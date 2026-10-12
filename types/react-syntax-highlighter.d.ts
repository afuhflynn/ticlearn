declare module "react-syntax-highlighter" {
  const Prism: React.ComponentType<{
    children: string;
    language?: string;
    style?: Record<string, unknown>;
    customStyle?: React.CSSProperties;
  }>;
  const oneDark: Record<string, unknown>;
  const light: Record<string, unknown>;
  const coy: Record<string, unknown>;
  export { Prism, oneDark, light, coy };
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  const content: Record<string, unknown>;
  export default content;
}
