export const geography = {
    cities: {
        'tokyo': { name: "Tokyo", population: 37468000, country: 'japan' },
        'delhi': { name: "Delhi", population: 28514000, country: 'india' },
        'shanghai': { name: "Shanghai", population: 25582000, country: 'china' },
        'sao_paulo': { name: "São Paulo", population: 21650000, country: 'brazil' },
        'mexico_city': { name: "Mexico City", population: 21581000, country: 'mexico' },
        'cairo': { name: "Cairo", population: 20076000, country: 'egypt' },
        'mumbai': { name: "Mumbai", population: 19980000, country: 'india' },
        'beijing': { name: "Beijing", population: 19618000, country: 'china' },
        'dhaka': { name: "Dhaka", population: 19378000, country: 'bangladesh' },
        'osaka': { name: "Osaka", population: 19281000, country: 'japan' },
    },
    countries: {
        'japan': { name: "Japan", cities: ['tokyo', 'osaka'] },
        'india': { name: "India", cities: ['delhi', 'mumbai'] },
        'china': { name: "China", cities: ['shanghai', 'beijing'] },
        'brazil': { name: "Brazil", cities: ['sao_paulo'] },
        'mexico': { name: "Mexico", cities: ['mexico_city'] },
        'egypt': { name: "Egypt", cities: ['cairo'] },
        'bangladesh': { name: "Bangladesh", cities: ['dhaka'] },
    },
    world: {
        name: "World",
    }
};

// Calculate country and world populations
Object.values(geography.countries).forEach(country => {
    country.population = country.cities.reduce((acc, cityId) => acc + geography.cities[cityId].population, 0);
});

geography.world.population = Object.values(geography.countries).reduce((acc, country) => acc + country.population, 0); 