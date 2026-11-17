youa re working as a full stack developer , and you have to create the whole working website in MERN stack, the project is about Roamora, a travel website for travel enthusiast.
Generate a separate panels for admin and user, having the folders naming frontend and backend.
In the frontend Use react native with the resuable components:
1. use components for motion- Motion.dev
2. React bits for Tranisistion and components
3. GSAP for scroll animation
4. Framer motions
5. React icons and luicide icons
6. use zod for forms 
7. use bootstrap in the whole website for ultra premimum layouts
8. use unbounded and DM SANS font import link is below
<style>
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@200..900&display=swap');
</style>
css class for variable: 
.unbounded-<uniquifier> {
  font-family: "Unbounded", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Unbounded:wght@200..900&display=swap');
</style>
css class varibale:

.unbounded-<uniquifier> {
  font-family: "Unbounded", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}
 
Features the website must contains:
1. login and accounts- using authentication and authorization logic
2. Search and filters- filtering and pagination
3. Trip Detail pages- day by day itenary, view photos
4. booking flew- choose dates, Travellers , total amount and confirm, Mongodb database logic and form validation logic 
5. User Dashboard: upcoming trips,previous trips, cancel trips- USing crud operations
6. Admin Dashboard: Manage packages, total revenue, use Line charts and bar grapphs and other chart visualisation for admin dashboard based on sales.
Example: use bar graph booking based on the destination where people more preffers to visit, use line graph for revenue per year or per month(option for months and year)
pie charts for customers based on tehe country or based on age category(use one pie charts based on your choice)
7. Trip comparision:compare up to three packages side by side by price, duration, accommodation, and included activities.
8. Interactive itinerary builder — drag activities between days and see the estimated trip cost update.
**USE Better layout FOR THE ADMIN DASHBOARD**
Respinsiveness:
The website must be responisve in all screen type by using bootstrap. ALso make sure that all te feature should be visible in all screen 

**frontend features**
wishlist-save favorite trips into wihslist modal in backend
search and filters-find trips by destination, budget, travel type, duration
compare trips-compare 2-3 trips detail side by side
review and ratings-user can post, delete and update review va review from hacing comment box to post as well.(all data of review must save in model)
interactive map when open the package details it must shoedestination and itenary stops(it  must be ona each deatil page, below each day by day itenary, use react leaflet for map and cretae a component name TripMap, use map tile provider fro road images and place name, sldo grnrrstre leaflet css woth defined height for the map based on the theme, add a logic of latitude and longtiude to point the exact location on the map, same logic must bein admin panel for admin to add the packages, use openstreetmap tile url)
email confirmation-nodemailer


**BACKEND**
The backend should be in Node.js and Express.js follwing the MVC-R(Model, View, Controller, Routes) pattern.use react router for navigation bwn trips , booking and dashboard
Make sure the data handling in between MVR must be correct.
following are the models that shoulde be there:
1. users
2. packages
3. orders
4. wishlist
5. array model for hero images, destinations, trending places, and others
6. reviews
**frontend layout**
*landing page*
First screen — mountain scenery(use the code attachd in hero.html hero.css. hero.js)
need exact gsap scrolltrigger layout like this in the link https://codepen.io/creativeocean/pen/qBbBLyB, your navbar, and “EXPLORE” in Unbounded.
On scroll — clouds and mountains move, revealing “BEYOND YOUR LIMITS”.
After the animation — the trip search bar and featured destinations appear with motion use motion.div, gsap, luicid eicons, framer motions and the react bit component fro preium effect look into react bits website for more exposure and use the components as per your style but the whole website must have ultra premium frontend design https://www.reactbits.dev/.
Explore trips button — lets visitors jump directly to the search section.
