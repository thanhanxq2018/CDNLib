function SerpentineLayout() {
    go.Layout.call(this);
    this.isViewportSized = true;
    this._spacing = new go.Size(30, 30);
    this._wrap = NaN;
}
go.Diagram.inherit(SerpentineLayout, go.Layout);

SerpentineLayout.prototype.cloneProtected = function (copy) {
    go.Layout.prototype.cloneProtected.call(this, copy);
    copy._spacing = this._spacing;
    copy._wrap = this._wrap;
};

SerpentineLayout.prototype.doLayout = function (coll) {
    var diagram = this.diagram;
    if (coll instanceof go.Diagram) {
        diagram = coll;
        coll = coll.nodes;  // use all links connecting with these nodes
    } else if (coll instanceof go.Group) {
        diagram = coll.diagram;
        coll = coll.memberParts;
    }

    var root = null;
    // find a root node -- one without any incoming links
    var it = coll.iterator;
    while (it.next()) {
        var n = it.value;
        if (!(n instanceof go.Node)) continue;
        if (root === null) root = n;
        if (n.findLinksInto().count === 0) {
            root = n;
            break;
        }
    }
    // couldn't find a root node
    if (root === null) return;

    var spacing = this.spacing;

    // calculate the width at which we should start a new row
    var wrap = this.wrap;
    if (diagram !== null && isNaN(wrap)) {
        if (this.group === null) {  // for a top-level layout, use the Diagram.viewportBounds
            var pad = diagram.padding;
            wrap = Math.max(spacing.width * 2, diagram.viewportBounds.width - 24 - pad.left - pad.right);
        } else {
            wrap = 1000; // provide a better default value?
        }
    }

    // implementations of doLayout that do not make use of a LayoutNetwork
    // need to perform their own transactions
    if (diagram !== null) diagram.startTransaction("Serpentine Layout");

    // start on the left, at Layout.arrangementOrigin
    var x = this.arrangementOrigin.x;
    var rowh = 0;
    var y = this.arrangementOrigin.y;
    var increasing = true;
    var node = root;
    while (node !== null) {
        var b = node.actualBounds;
        // get the next node, if any
        var nextlink = node.findLinksOutOf().first();
        var nextnode = (nextlink !== null ? nextlink.toNode : null);
        var nb = (nextnode !== null ? nextnode.actualBounds : new go.Rect());
        if (increasing) {
            node.move(new go.Point(x, y));
            x += b.width;
            rowh = Math.max(rowh, b.height);
            if (x + spacing.width + nb.width > wrap) {
                y += rowh + spacing.height;
                x = wrap - spacing.width;
                rowh = 0;
                increasing = false;
                if (nextlink !== null) {
                    nextlink.fromSpot = go.Spot.Right;
                    nextlink.toSpot = go.Spot.Right;
                }
            } else {
                x += spacing.width;
                if (nextlink !== null) {
                    nextlink.fromSpot = go.Spot.Right;
                    nextlink.toSpot = go.Spot.Left;
                }
            }
        } else {
            x -= b.width;
            node.move(new go.Point(x, y));
            rowh = Math.max(rowh, b.height);
            if (x - spacing.width - nb.width < 0) {
                y += rowh + spacing.height;
                x = 0;
                rowh = 0;
                increasing = true;
                if (nextlink !== null) {
                    nextlink.fromSpot = go.Spot.Left;
                    nextlink.toSpot = go.Spot.Left;
                }
            } else {
                x -= spacing.width;
                if (nextlink !== null) {
                    nextlink.fromSpot = go.Spot.Left;
                    nextlink.toSpot = go.Spot.Right;
                }
            }
        }
        node = nextnode;
    }

    if (diagram !== null) diagram.commitTransaction("Serpentine Layout");
};

Object.defineProperty(SerpentineLayout.prototype, "spacing", {
    get: function () { return this._spacing; },
    set: function (val) {
        if (!(val instanceof go.Size)) throw new Error("new value for SerpentineLayout.spacing must be a Size, not: " + val);
        if (!this._spacing.equals(val)) {
            this._spacing = val;
            this.invalidateLayout();
        }
    }
});

Object.defineProperty(SerpentineLayout.prototype, "wrap", {
    get: function () { return this._wrap; },
    set: function (val) {
        if (this._wrap !== val) {
            this._wrap = val;
            this.invalidateLayout();
        }
    }
});