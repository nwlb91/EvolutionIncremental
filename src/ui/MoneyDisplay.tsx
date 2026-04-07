interface Props {
  money: number;
}

export function MoneyDisplay({ money }: Props) {
  return (
    <div style={{ padding: "8px 16px", background: "#222", color: "#0f0", fontSize: 20, fontFamily: "monospace" }}>
      $ {money}
    </div>
  );
}
