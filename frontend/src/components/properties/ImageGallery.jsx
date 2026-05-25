import ReactImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";

export default function ImageGallery({ images = [] }) {
  const items = (images.length ? images : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200"]).slice(0, 5).map((src) => ({ original: src, thumbnail: src }));
  return <ReactImageGallery items={items} showPlayButton={false} />;
}
