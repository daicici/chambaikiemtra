type Props = {
  message: string;
};

export function ScanStatus({ message }: Props) {
  return <p className="review">{message}</p>;
}
