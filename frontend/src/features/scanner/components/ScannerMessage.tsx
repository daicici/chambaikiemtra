type Props = {
  message: string;
};

export function ScannerMessage({ message }: Props) {
  return <div className="status-list">{message}</div>;
}
