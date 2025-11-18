class APIFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    search() {
        const keyword = this.queryStr.keyword ? {
            name: {
                $regex: this.queryStr.keyword,
                $options: 'i'
            }
        } : {};
       
        this.query = this.query.find({ ...keyword });
        return this;
    }

    filter() {
        const queryCopy = { ...this.queryStr };

        // Removing fields from the query
        const removeFields = ['keyword', 'limit', 'page', 'sortByPrice', 'sort'];
        removeFields.forEach(el => delete queryCopy[el]);

        // Advance filter for price, ratings etc
        // Convert operators (gt, gte, lt, lte) to MongoDB operators ($gt, $gte, $lt, $lte)
        let queryStr = JSON.stringify(queryCopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);
        
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    sort() {
        if (this.queryStr.sortByPrice) {
            // Support both numeric (1, -1) and string ('asc', 'desc') formats
            let sortOrder;
            if (this.queryStr.sortByPrice === 'asc' || this.queryStr.sortByPrice === '1' || this.queryStr.sortByPrice === 1) {
                sortOrder = 1; // Ascending (tăng dần)
            } else if (this.queryStr.sortByPrice === 'desc' || this.queryStr.sortByPrice === '-1' || this.queryStr.sortByPrice === -1) {
                sortOrder = -1; // Descending (giảm dần)
            } else {
                sortOrder = -1; // Default to descending
            }
            this.query = this.query.sort({ price: sortOrder });
        } else if (this.queryStr.sort) {
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            // Default sort by creation date (newest first)
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    pagination(resPerPage) {
        const currentPage = Number(this.queryStr.page) || 1;
        const skip = resPerPage * (currentPage - 1);
  
        this.query = this.query.limit(resPerPage).skip(skip);
        return this;
    }
}

module.exports = APIFeatures;
