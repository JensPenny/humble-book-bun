## 2025-03-25

This folder will contain the hugo project that will generate a static site.
The concept is that we will extract the humble bundle data from the postgres database filled from the api.
This data will be added to the hugo site as a data export.
Hugo will then create a statically generated site for this.

## 2025-03-29

While I think I can get the hang of the templating engine from hugo, it is pretty hard to debug and write. 
Even while knowing golang the syntax is pretty weird, and the fact that the `.` operator changes based on what your context is, isn't helping either.
I'm not even kidding when I say that this would be less confusing even if it was pure golang, because whatever it is now is pretty bad in my opinion.


### Astro template query for AI

Generate a static site based on templates for astro. You must use the latest version of astro for this. 
The folder for astro is ./site_gen/humble_astro. The data files are in the 'data' folder of the site.
There are 3 data files: 

- books.json contains all single books, and a reference to their bundle ID. 
  An example record is ` {"id":231,"bundle_id":37,"bundle_name":"Humble RPG Bundle: Classic Pathfinder Mega Bundle 2025","name":"Advanced Feats: Might of the Magus","description":"<p>Might of the Magus brings you feats of swordsmanship and spellcraft, expanding the range of this already versatile class!</p><p>Created by Complete Advanced Feats author Sigfried Trent, this 16-page book includes:</p><p>An insightful breakdown of the magus class</p>","content_type":"ebook","url":"https://www.goodreads.com/search?q=Advanced%20Feats%3A%20Might%20of%20the%20Magus","rating_average":3.8,"rating_count":22,"review_count":12,"created":"2025-03-22T22:04:48+00:00","developers":"Sigfried Trent"}, 
`
- bundles.json contains all bundles.
  An example record is ` {"id":37,"name":"Humble RPG Bundle: Classic Pathfinder Mega Bundle 2025","type":"ebook","url":"books/classic-pathfinder-mega-bundle-2025-books","start_date":"2025-03-22T22:00:56+00:00","end_date":"2025-04-03T16:00:00+00:00","created_date":"2025-03-22T22:04:48+00:00"}, 
`
- bundles_with_books.json contains a full json that combines the data
  ```{"id":35,"name":"Humble Book Bundle: Self-Reliance and Off-Grid Skills for Dummies","type":"ebook","url":"books/selfreliance-and-offgrid-skills-for-dummies-books","start_date":"2025-03-22T21:57:39+00:00","end_date":"2025-04-07T16:00:00+00:00","created":"2025-03-22T21:58:46+00:00","books":[{"id":142,"name":"Alternative Energy For Dummies","description":"<p>Alternative Energy For Dummies presents readers with a multifaceted examination of various forms of alternative energy, including solar, wind, nuclear, biomass, geothermal, biofuel, and other sources. Each alternative scenario is compared to current fossil-fuel intensive practices in the scientific, environmental, social, political, and economic realms.</p>","content_type":"ebook","url":"https://www.goodreads.com/book/show/7084105-alternative-energy-for-dummies?from_search=true&amp;from_srp=true&amp;qid=oY0B0N83Hl&amp;rank=1","rating_average":3.72,"rating_count":43,"review_count":2,"created":"2025-03-22T21:58:46+00:00","developers":"Rik DeGunther"}, 
 {"id":143,"name":"Backyard Homesteading All-in-One For Dummies","description":"<p>Backyard Homesteading AIO For Dummies has a little bit of everything. It walks you through the basics of creating your own sustainable homestead.</p><p>Topics include:</p><ul><li>Raising and keeping chickens</li><li>Beekeeping</li><li>Composting Canning &amp; preserving</li><li>Sustainable landscaping</li><li>Organic gardening</li></ul>","content_type":"ebook","url":"https://www.goodreads.com/book/show/45313640-backyard-homesteading-all-in-one-for-dummies?from_search=true&amp;from_srp=true&amp;qid=dr9dKDQJ36&amp;rank=1","rating_average":3.92,"rating_count":24,"review_count":3,"created":"2025-03-22T21:58:46+00:00","developers":"Todd Brock"}, 
 {"id":144,"name":"Bread Making For Dummies",...```. This example is incomplete but you should get the gist.

 If you want to check the original database-format, you can check the db/create_database.sql file.

Create an astro site that can generate a static website where we can list these bundles, and where we can see the book information for these bundles as well.

### After generating the site

Well that went better than expected...
After quickly looking over the code, I have dropped the whole hugo site. At least we did learn some things there, mainly that for static site generation astro will probably be a better choice. The templates are more readable, and most of the content is provided on a single spot.