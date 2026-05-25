export default function AmenitiesGrid({ amenities = [] }) {
  return <div className="grid grid-cols-2 gap-2">{amenities.map((a) => <div key={a} className="rounded border bg-white p-2">{a}</div>)}</div>;
}
