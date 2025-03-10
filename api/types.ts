export interface Bundle {
    name: string;
    author: string;
    type: string;
    url: string; // The bundle URL
    start_bundle: Date;
    end_bundle: Date;
}

export interface BookItem {
    human_name: string;
    description_text: string;
    item_content_type: string;
    developers: Developer[];
}

export interface Developer {
    developer_name: string;
}

export interface GoodreadsRating {
    url: string | null; // The used goodreads URL
    ratingValue: number | null;
    ratingCount: number | null;
    reviewCount: number | null;
}

export const UnmarshalBookItem = (data: any): BookItem => ({
    human_name: data.human_name,
    description_text: data.description_text,
    item_content_type: data.item_content_type,
    developers: data.developers.map((dev: any) => ({
        developer_name: dev["developer-name"],
    })),
});
