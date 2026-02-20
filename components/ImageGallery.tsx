// 'use client';

// import Image from 'next/image';
// import { useState } from 'react';

// const images = [
//   '/images/photo1.jpeg',
//   '/images/photo2.jpeg',
//   '/images/photo3.jpeg',
//   '/images/photo4.jpeg',
//   '/images/photo5.jpeg',
// ];

// export default function ImageGallery() {
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);

//   return (
//     <section className="py-12 bg-[var(--background)]">
//       <div className="container mx-auto px-4">
//         <h2 className="text-3xl font-bold text-center mb-8 text-[var(--foreground)]">Our Gallery</h2>
        
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//           {images.map((src, index) => (
//             <div 
//               key={index} 
//               className="relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 aspect-square"
//               onClick={() => setSelectedImage(src)}
//             >
//               <Image
//                 src={src}
//                 alt={`Gallery image ${index + 1}`}
//                 fill
//                 className="object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
//                 sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
//                 priority={index < 3}
//               />
//             </div>
//           ))}
//         </div>

//         {/* Modal for enlarged image */}
//         {selectedImage && (
//           <div 
//             className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
//             onClick={() => setSelectedImage(null)}
//           >
//             <div className="relative w-full max-w-4xl max-h-[90vh]">
//               <Image
//                 src={selectedImage}
//                 alt="Enlarged view"
//                 width={1200}
//                 height={800}
//                 className="max-h-[80vh] w-auto mx-auto object-contain"
//               />
//               <button 
//                 className="absolute -top-12 right-0 text-white text-2xl"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setSelectedImage(null);
//                 }}
//               >
//                 ✕
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </section>
//   );
// }
