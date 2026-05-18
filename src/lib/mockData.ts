// @ts-nocheck
export interface Worker {
    id: string
    name: string
    profession: string
    professionId: string
    phone: string
    rating: number
    reviewCount: number
    distanceKm: number
    experience: string
    experienceYears: number
    isVerified: boolean
    location: string
    services: string[]
    about: string
    reviews: Review[]
    joinedYear: number
}

export interface Review {
    id: string
    name: string
    rating: number
    text: string
    date: string
}

export const MOCK_WORKERS: Worker[] = [
    {
        id: '1',
        name: 'Ramesh Kumar Sahu',
        profession: 'Electrician',
        professionId: 'electrician',
        phone: '+91 98765 43210',
        rating: 4.9,
        reviewCount: 43,
        distanceKm: 1.2,
        experience: '3 yrs',
        experienceYears: 3,
        isVerified: true,
        location: 'Shankar Nagar, Raipur',
        services: ['Fan installation', 'Switchboard repair', 'Home wiring', 'MCB / fuse box', 'CCTV wiring', 'Inverter wiring'],
        about: 'Licensed electrician with 3+ years of residential and commercial experience. Specialise in new connections, wiring, and smart home setups.',
        joinedYear: 2022,
        reviews: [
            { id: 'r1', name: 'Anjali Sharma', rating: 5, text: 'Very professional and on time. Fixed wiring issue quickly.', date: '2 days ago' },
            { id: 'r2', name: 'Rohan Gupta', rating: 4, text: 'Good work, reasonable price. Recommend!', date: '1 week ago' },
            { id: 'r3', name: 'Priya Mehta', rating: 5, text: 'Excellent service. Very polite and clean.', date: '2 weeks ago' },
        ],
    },
    {
        id: '2',
        name: 'Ajay Sharma',
        profession: 'Plumber',
        professionId: 'plumber',
        phone: '+91 87654 32109',
        rating: 4.7,
        reviewCount: 28,
        distanceKm: 2.1,
        experience: '5 yrs',
        experienceYears: 5,
        isVerified: true,
        location: 'Civil Lines, Raipur',
        services: ['Tap / faucet repair', 'Drain cleaning', 'Pipeline leak repair', 'Bathroom fitting', 'Geyser pipe fitting'],
        about: 'Expert plumber for all residential needs. Fast response, transparent pricing.',
        joinedYear: 2020,
        reviews: [
            { id: 'r1', name: 'Sanjay Tiwari', rating: 5, text: 'Fixed the drain issue same day. Highly recommend.', date: '3 days ago' },
            { id: 'r2', name: 'Meena Patel', rating: 4, text: 'Good work. Came on time.', date: '10 days ago' },
        ],
    },
    {
        id: '3',
        name: 'Suresh Patel',
        profession: 'AC Technician',
        professionId: 'ac_technician',
        phone: '+91 76543 21098',
        rating: 4.5,
        reviewCount: 15,
        distanceKm: 3.4,
        experience: '2 yrs',
        experienceYears: 2,
        isVerified: false,
        location: 'Telibandha, Raipur',
        services: ['AC installation (split)', 'AC servicing', 'AC gas refilling', 'AC repair'],
        about: 'Certified AC technician. Handles split, window, and cassette AC units.',
        joinedYear: 2023,
        reviews: [
            { id: 'r1', name: 'Kavita Verma', rating: 5, text: 'Quick service. AC works perfectly now.', date: '5 days ago' },
        ],
    },
    {
        id: '4',
        name: 'Nikhil Verma',
        profession: 'Carpenter',
        professionId: 'carpenter',
        phone: '+91 65432 10987',
        rating: 4.8,
        reviewCount: 61,
        distanceKm: 1.8,
        experience: '8 yrs',
        experienceYears: 8,
        isVerified: true,
        location: 'Pandri, Raipur',
        services: ['Furniture assembly', 'Wardrobe making', 'Kitchen cabinet installation', 'Modular kitchen', 'Wooden flooring'],
        about: 'Master carpenter specialising in modular kitchens, wardrobes, and custom furniture.',
        joinedYear: 2017,
        reviews: [
            { id: 'r1', name: 'Ritu Singh', rating: 5, text: 'Outstanding modular kitchen work. Very neat finish.', date: '1 week ago' },
            { id: 'r2', name: 'Deepak Joshi', rating: 5, text: 'Great craftsman. Completed on time.', date: '3 weeks ago' },
        ],
    },
    {
        id: '5',
        name: 'Ankit Sinha',
        profession: 'Painter',
        professionId: 'painter',
        phone: '+91 54321 09876',
        rating: 4.6,
        reviewCount: 19,
        distanceKm: 2.9,
        experience: '4 yrs',
        experienceYears: 4,
        isVerified: false,
        location: 'Amanaka, Raipur',
        services: ['Interior wall painting', 'Texture painting', 'Wood polishing', 'Putty & primer'],
        about: 'Professional painter for interior and exterior jobs. Clean and efficient.',
        joinedYear: 2021,
        reviews: [
            { id: 'r1', name: 'Pooja Agarwal', rating: 4, text: 'Good finish. Took slightly longer than estimated.', date: '2 weeks ago' },
        ],
    },
    {
        id: '6',
        name: 'Vikram Yadav',
        profession: 'Cleaner',
        professionId: 'cleaner',
        phone: '+91 43210 98765',
        rating: 4.3,
        reviewCount: 32,
        distanceKm: 0.9,
        experience: '6 yrs',
        experienceYears: 6,
        isVerified: true,
        location: 'Ram Nagar, Raipur',
        services: ['Full home deep cleaning', 'Kitchen deep cleaning', 'Sofa cleaning', 'Carpet shampooing'],
        about: 'Professional cleaning specialist. Uses eco-friendly products.',
        joinedYear: 2019,
        reviews: [
            { id: 'r1', name: 'Neha Gupta', rating: 5, text: 'Spotless home. Will book again!', date: '4 days ago' },
            { id: 'r2', name: 'Arjun Mishra', rating: 4, text: 'Good cleaning but missed the balcony area.', date: '2 weeks ago' },
        ],
    },
]

export const UNLOCK_PRICE = 29

export const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'electrician', label: 'Electrician' },
    { id: 'plumber', label: 'Plumber' },
    { id: 'ac_technician', label: 'AC Tech' },
    { id: 'carpenter', label: 'Carpenter' },
    { id: 'cleaner', label: 'Cleaner' },
    { id: 'painter', label: 'Painter' },
]

export type SortOption = 'distance' | 'rating' | 'experience'
