"use client";
import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import type { Listing } from "@/lib/listings/types";

const districts=["Akkari","Aviation","Les Orangers","Médina","Hay El Fath"] as const;
function listing(index:number,district:string){return {id:`p2-rabat-${index}`,title:`Aperçu resolver ${district}`,city:"Rabat",neighborhood:district,price:1500000+index*100000,currency:"DH",surface_m2:100+index*10,property_type:index%2===0?"Appartement":"Villa",transaction_type:"buy",bedrooms:3,bathrooms:2,listing_url:`https://example.test/rabat/${encodeURIComponent(district)}/${index}`,display_images:{policy:"no_listing_image"},production_allowed:true,can_show_result:true} as unknown as Listing;}
export function RabatNeighborhoodResolverP2QAFixture(){return <PropertySelectionProvider><section data-p2-rabat-grid className="grid grid-cols-2 gap-x-2.5 gap-y-6 lg:grid-cols-3 lg:gap-x-3">{districts.map((district,index)=><div key={district} data-p2-rabat-card data-expected-district={district} className="min-w-0"><SearchListingCardDark listing={listing(index,district)}/></div>)}</section></PropertySelectionProvider>}
