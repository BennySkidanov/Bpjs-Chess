const piecesPrefixes = {
    "a": "Pawn",
    "b": "Pawn",
    "c": "Pawn",
    "d": "Pawn",
    "e": "Pawn",
    "f": "Pawn",
    "g": "Pawn",
    "h": "Pawn",
    "P": "Pawn",
    "B": "Bishop",
    "N": "Knight",
    "R": "Rook",
    "Q": "Queen",
    "K": "King"
};

bp.store.put("NON-FEATURE: QUEENING_COUNTER", 0);

function Cell(i, j, pieceId) {
    return ctx.Entity(i + j, 'cell', {i: i, j: j, pieceId: pieceId})
}

function Piece(subtype, number, color, cellId) {
    return ctx.Entity('piece' + "_" + number, 'piece', {
        subtype: subtype,
        number: number, color: color, cellId: cellId
    })
}

/*

    We have 64 cells on the chess board, we can identify them uniquely the combination of letters as columns and digits as rows, just like in the real gamke.
    For example, let's suppose we are playing White, the board will look like :

    a8 b8 c8 d8 e8 f8 g8 h8
    a7 b7 c7 d7 e7 f7 g7 h7
    a6 b6 c6 d6 e6 f6 g6 h6
    a5 b5 c5 d5 e5 f5 g5 h5
    a4 b4 c4 d4 e4 f4 g4 h4
    a3 b3 c3 d3 e3 f3 g3 h3
    a2 b2 c2 d2 e2 f2 g2 h2
    a1 b1 c1 d1 e1 f1 g1 h1

*/


ctx.registerQuery("Cell.all", function (entity) {
    return entity.type == 'cell';
})

ctx.registerQuery("ready to mate on f7", function (entity) {
    if (entity.id != 'phase') return false
    // let bishops = ctx.runQuery(getSpecificType('Bishop', 'White'))
    // let whiteCellBishop = null
    // for (let i = 0; i < bishops.length; i++) {
    //     if ( (bishops[i].cellId[0].charCodeAt(0) - 'a'.charCodeAt(0) + (bishops[i].cellId[1] - '0')) % 2 == 1) {
    //         whiteCellBishop = bishops[i];
    //         break;
    //     }
    // }
    let pieces = ctx.runQuery('Piece.White.All')
    let queen = null
    let found = false
    let returnValue = false
    // bp.log.info("Searching White Queen")
    // bp.log.info(pieces)
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i].subtype === 'Queen') {
            queen = pieces[i]
            found = true
            break
        }
    }
    if (found) {
        // bp.log.info("White queen => " + JSON.stringify(queen))
        returnValue = canReachSquare(queen, 'f7', false, false)
        // bp.log.info("Can queen reach f7? answer : " + returnValue)
    }
    // bp.store.put("ready to mate on f7", retval ? 1 : 0)
    return returnValue
})

ctx.registerQuery("Cell.all.nonOccupied", function (entity) {
    return entity.type == 'cell' && entity.pieceId == undefined;
})

ctx.registerQuery("Piece.White.All",
    function (entity) {
        return entity.type == 'piece' && entity.color == 'White';
    })

ctx.registerQuery("Piece.Black.All",
    function (entity) {
        return entity.type == 'piece' && entity.color == 'Black';
    })

ctx.registerQuery("Piece.All",
    function (entity) {
        return entity.type == 'piece';
    })


/*ctx.registerQuery("Piece.White.Pawn" ,
  entity => entity.type == 'piece' && entity.subtype == 'Pawn' && entity.color == 'White')

ctx.registerQuery("Piece.White.Bishop" ,
    entity => entity.type == 'piece' && entity.subtype == 'Bishop' && entity.color == 'White')

ctx.registerQuery("Piece.White.Rook" ,
    entity => entity.type == 'piece' && entity.subtype == 'Rook' && entity.color == 'White')*/

//ctx.registerQuery("Piece.All", entity => entity.type.equals('piece'))
//ctx.registerQuery("Piece.Pawn", entity => entity.type.equals('piece') && entity.data.type.equals('Pawn'))
ctx.registerQuery("Phase.Opening", function (entity) {
    return entity.id == 'phase' && entity.phase == 'Opening';
})
ctx.registerQuery("Phase.MidGame", function (entity) {
    return entity.id == 'phase' && entity.phase == 'mid game';
})

//ctx.registerQuery("Phase.Developing.Pawn", entity => entity.id=='phase' && entity.phase == 'opening' && entity.innerPhase == 'develop pawn')

function getSpecificType(type, color) {
    return function (entity) {
        return entity.type.equals(String('piece')) &&
            entity.subtype.equals(String(type)) &&
            entity.color.equals(String(color));
    }
}

function getSpecificPiece(id) {
    return function (entity) {
        return entity.type.equals(String('piece')) &&
            entity.id.equals(id);
    }
}

function getOpponentKingCell(playerColor) {
    let OpponentColor = playerColor === "White" ? "Black" : "White";
    return function (entity) {
        return entity.type.equals(String('piece')) &&
            entity.subtype.equals(String('King')) &&
            entity.color.equals(String(OpponentColor));
    }
}

function getWhiteQueen() {
    return function (entity) {
        return entity.type.equals(String('piece')) &&
            entity.subtype.equals(String('Queen')) &&
            entity.color.equals(String('White'));
    }
}

function getSpecificPieceOnCell(cell_identifier) {
    // bp.log.info("~~ LOG (141) ~~ " + cell_identifier)
    return function (entity) {
        return entity.type.equals(String('piece')) &&
            entity.cellId[0].equals(String(cell_identifier.charAt(0))) &&
            entity.cellId[1].equals(String(cell_identifier.charAt(1)));
    }
}

// Game phase changed event
ctx.registerEffect("Game Phase", function (e) {
    bp.log.info("PHASE CHANGE")
    let phase = ctx.getEntityById("phase")
    phase.phase = e
    bp.log.info(phase)
    // ctx.updateEntity(phase) // no need in COBPjs 0.6.0
})
/*
ctx.registerEffect("Develop", function(e) {
  let entity = ctx.getEntityById("phase")
  entity.innerPhase = 'develop ' + e
  ctx.updateEntity(entity)
})
*/


ctx.registerEffect("Move", function (e) {
    // Debugging
    // bp.log.info("~~ DAL LOG ~~ Chosen Move : " + JSON.stringify(e))
    // bp.log.info("~~ DAL LOG ~~ Move Effect ")

    // This function handles the effect of the move, e.g., removing taken pieces off the game board.

    let srcCell, dstCell, srcPiece, dstPiece

    srcCell = ctx.getEntityById(e.src.toString())
    dstCell = ctx.getEntityById(e.dst.toString())
    srcPiece = ctx.getEntityById(srcCell.pieceId.toString())


    if (e.takes) { // Takes

        // bp.store.put("NON-FEATURE: TAKEN PIECE", dstPiece.subtype);
        if (e.takes && dstCell.pieceId == null) { // En - Passant Taking
            /*
                En - Passant situation :
                    srcPiece - Stays the same
                    dstPiece - Stays the same
                    srcCell - Stays the same
                    dstCell - Different! The destination of the source piece is now empty and not occupied by a piece
            */

            bp.log.info("~~ DAL LOG ~~ need to handle En - passant")
            let enPassantDstCell = ctx.getEntityById(e.dst.charAt(0) + String.fromCharCode(e.dst.charCodeAt(1) - 1));
            dstPiece = ctx.getEntityById(enPassantDstCell.pieceId.toString());
            bp.log.info("~~ DAL LOG ~ En - passant cell -> " + JSON.stringify(enPassantDstCell))
            bp.log.info("~~ DAL LOG ~ En - passant piece -> " + JSON.stringify(dstPiece))

            enPassantDstCell.pieceId = undefined
            dstCell.pieceId = srcPiece.id
            srcPiece.cellId = dstCell.id

        } else { // Regular Taking Move
            dstPiece = ctx.getEntityById(dstCell.pieceId.toString())
            dstCell.pieceId = srcPiece.id
            srcPiece.cellId = dstCell.id
        }

        ctx.removeEntity(dstPiece)
    } else { // Regular Move
        if ((e.dst.charAt(1) === '8' || e.dst.charAt(1) === '1') && e.piece === "Pawn") { // Queening
            let QUEENING_COUNTER = bp.store.get("NON-FEATURE: QUEENING_COUNTER") + 100;
            // bp.log.info("Queening, Changing Piece [dal.js], dstcell[1] = " + dstCell.id[1])
            // let color = dstCell.id[1] === '8' ? "White" : "Black"
            // bp.log.info("Color of new queen : " + color)
            let newQueen = Piece("Queen", QUEENING_COUNTER, e.color, dstCell.id);
            dstCell.pieceId = newQueen.id
            bp.store.put("NON-FEATURE: QUEENING_COUNTER", QUEENING_COUNTER);
            ctx.insertEntity(newQueen)
            ctx.removeEntity(srcPiece)
        } else {

        }
        dstCell.pieceId = srcPiece.id
        srcPiece.cellId = dstCell.id
    }

    srcCell.pieceId = undefined
    /*  if (srcCell.pieceId != null) {



    // }

    // if (dstCell.pieceId != null) {
        // dstPiece = ctx.getEntityById(dstCell.pieceId.toString())
        // bp.log.info("TAKEN PIECE " + dstPiece.subtype)

    // }
    // else if (e.takes && dstCell.pieceId == null ) {
    //
    //
    //     bp.log.info("~~ DAL LOG ~~ need to handle En - passant")
    //
    //
    // }


    // bp.log.info(srcPiece.subtype)


    // if ((dstCell.id[1] === '8' || dstCell.id[1] === '1') && srcPiece.subtype === "Pawn") {
    //     let QUEENING_COUNTER = bp.store.get("NON-FEATURE: QUEENING_COUNTER") + 100;
    //     // Queening, Create new piece
    //     bp.log.info("Queening, Changing Piece [dal.js], dstcell[1] = " + dstCell.id[1])
    //     let color = dstCell.id[1] === '8' ? "White" : "Black"
    //     bp.log.info("Color of new queen : " + color)
    //     let newQueen = Piece("Queen", QUEENING_COUNTER, color, dstCell.id);
    //     dstCell.pieceId = newQueen.id
    //     bp.store.put("NON-FEATURE: QUEENING_COUNTER", QUEENING_COUNTER);
    //     ctx.insertEntity(newQueen)
    //     // ctx.updateEntity(dstCell) // no need in COBPjs 0.6.0
    //     ctx.removeEntity(srcPiece)
    // } else {
    //     dstCell.pieceId = srcPiece.id
    // }
    // ctx.updateEntity(dstCell) // no need in COBPjs 0.6.0

    // srcCell.pieceId = undefined
    // // ctx.updateEntity(srcCell) // no need in COBPjs 0.6.0
    //
    // srcPiece.cellId = dstCell.id
    // // ctx.updateEntity(srcPiece) // no need in COBPjs 0.6.0

    // if (dstPiece)
    //     ctx.removeEntity(dstPiece)

    bp.log.info("MOVE HAS FINISHED")
*/
})

// ctx.registerEffect("Short Castle White", function (e) {
//   let srcCell = ctx.getEntityById("e1")
//   let dstCell = ctx.getEntityById(e.dst.toString())
//   //bp.log.info(srcCell)
//   //bp.log.info(dstCell)
//
//   let srcPiece = null
//   let dstPiece = null
//   if (srcCell.pieceId != null) {
//     srcPiece = ctx.getEntityById(srcCell.pieceId.toString())
//   }
//   if (dstCell.pieceId != null) {
//     dstPiece = ctx.getEntityById(dstCell.pieceId.toString())
//   }
//   //bp.log.info(srcPiece)
//   //bp.log.info(dstPiece)
//
//
//   dstCell.pieceId = srcPiece.id
//   ctx.updateEntity(dstCell)
//
//   srcCell.pieceId = undefined
//   ctx.updateEntity(srcCell)
//
//   srcPiece.cellId = dstCell.id
//   ctx.updateEntity(srcPiece)
//
//   if (dstPiece)
//     ctx.removeEntity(dstPiece)
//
//   //bp.log.info("MOVE HAS FINISHED")
//
// })

// function shortCastleEvent(color) {
//   if (color == "White") {
//     return bp.Event("Short Castle " + color);
//   }
// }


const prefix = ["", "N", "B", "R", "Q", "K"];
const pieces = ["Pawn", "Knight", "Bishop", "Rook", "Queen", "King"];

function moveEvent(piece, oldCell, newCell, color, takes, checkmate, check) {
    // bp.log.info("~~ DAL LOG ~~ Move Event : " + color + " " + piece + " : " + oldCell + " => " + newCell);
    return bp.Event("Move", {
        piece: piece,
        src: oldCell,
        dst: newCell,
        color: color,
        takes: takes,
        checkmate: false,
        check: false
    });
}


/*function moveEventPGN(piece, newCell) {
  let srcCell = piece.data.cellId;
  return bp.Event("Move", {piece: piece, src: srcCell, dst: newCell});
}*/

function prefixOfPiece(piece) {
    let idx = 0
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i] == piece) {
            return prefix[idx]
        } else {
            idx++
        }
    }
}


function populateContext() {
    let pieces = [Piece("King", 1, "White", "e1"),
        Piece("King", 2, "Black", "e8"),
        Piece("Queen", 3, "White", "d1"),
        Piece("Queen", 4, "Black", "d8"),
        Piece("Bishop", 5, "White", "c1"),
        Piece("Bishop", 6, "White", "f1"),
        Piece("Bishop", 7, "Black", "c8"),
        Piece("Bishop", 8, "Black", "f8"),
        Piece("Knight", 9, "White", "b1"),
        Piece("Knight", 10, "White", "g1"),
        Piece("Knight", 11, "Black", "b8"),
        Piece("Knight", 12, "Black", "g8"),
        Piece("Rook", 13, "White", "a1"),
        Piece("Rook", 14, "White", "h1"),
        Piece("Rook", 15, "Black", "a8"),
        Piece("Rook", 16, "Black", "h8"),


        Piece("Pawn", 21, "White", "a2"), Piece("Pawn", 22, "White", "b2"), Piece("Pawn", 23, "White", "c2"),
        Piece("Pawn", 24, "White", "d2"), Piece("Pawn", 25, "White", "e2"), Piece("Pawn", 26, "White", "f2"),
        Piece("Pawn", 27, "White", "g2"), Piece("Pawn", 28, "White", "h2"),
        Piece("Pawn", 31, "Black", "a7"), Piece("Pawn", 32, "Black", "b7"), Piece("Pawn", 33, "Black", "c7"),
        Piece("Pawn", 34, "Black", "d7"), Piece("Pawn", 35, "Black", "e7"), Piece("Pawn", 36, "Black", "f7"),
        Piece("Pawn", 37, "Black", "g7"), Piece("Pawn", 38, "Black", "h7")]

    let cells = [

        Cell('a', '1', 'piece' + "_" + 13),
        Cell('b', '1', 'piece' + "_" + 9),
        Cell('c', '1', 'piece' + "_" + 5),
        Cell('d', '1', 'piece' + "_" + 3),
        Cell('e', '1', 'piece' + "_" + 1),
        Cell('f', '1', 'piece' + "_" + 6),
        Cell('g', '1', 'piece' + "_" + 10),
        Cell('h', '1', 'piece' + "_" + 14),

        Cell('a', '8', 'piece' + "_" + 15),
        Cell('b', '8', 'piece' + "_" + 11),
        Cell('c', '8', 'piece' + "_" + 7),
        Cell('d', '8', 'piece' + "_" + 4),
        Cell('e', '8', 'piece' + "_" + 2),
        Cell('f', '8', 'piece' + "_" + 8),
        Cell('g', '8', 'piece' + "_" + 12),
        Cell('h', '8', 'piece' + "_" + 16),

        Cell('a', '2', 'piece' + "_" + 21),
        Cell('b', '2', 'piece' + "_" + 22),
        Cell('c', '2', 'piece' + "_" + 23),
        Cell('d', '2', 'piece' + "_" + 24),
        Cell('e', '2', 'piece' + "_" + 25),
        Cell('f', '2', 'piece' + "_" + 26),
        Cell('g', '2', 'piece' + "_" + 27),
        Cell('h', '2', 'piece' + "_" + 28),
        Cell('a', '7', 'piece' + "_" + 31),
        Cell('b', '7', 'piece' + "_" + 32),
        Cell('c', '7', 'piece' + "_" + 33),
        Cell('d', '7', 'piece' + "_" + 34),
        Cell('e', '7', 'piece' + "_" + 35),
        Cell('f', '7', 'piece' + "_" + 36),
        Cell('g', '7', 'piece' + "_" + 37),
        Cell('h', '7', 'piece' + "_" + 38),

        Cell('a', '3', undefined), Cell('b', '3', undefined), Cell('c', '3', undefined), Cell('d', '3', undefined),
        Cell('e', '3', undefined), Cell('f', '3', undefined), Cell('g', '3', undefined), Cell('h', '3', undefined),
        Cell('a', '4', undefined), Cell('b', '4', undefined), Cell('c', '4', undefined), Cell('d', '4', undefined),
        Cell('e', '4', undefined), Cell('f', '4', undefined), Cell('g', '4', undefined), Cell('h', '4', undefined),
        Cell('a', '5', undefined), Cell('b', '5', undefined), Cell('c', '5', undefined), Cell('d', '5', undefined),
        Cell('e', '5', undefined), Cell('f', '5', undefined), Cell('g', '5', undefined), Cell('h', '5', undefined),
        Cell('a', '6', undefined), Cell('b', '6', undefined), Cell('c', '6', undefined), Cell('d', '6', undefined),
        Cell('e', '6', undefined), Cell('f', '6', undefined), Cell('g', '6', undefined), Cell('h', '6', undefined),
    ]

    ctx.populateContext(pieces)
    ctx.populateContext(cells)
    ctx.populateContext([ctx.Entity("phase", "phase", {phase: ""})])

    // ctx.insertEntity("explanations", "explanation",{explanations: new Set()})
    // cells.forEach(function(c) { ctx.insertEntity(c.id,'cell', c) })
    /*for (let i = 0; i < cells.size; i++) {
      ctx.insertEntity(cells[i].id, 'cell', cells[i])
    }

    //pieces.forEach(function(p) { ctx.insertEntity(p.id,'piece', p) })
    for (let i = 0; i < pieces.size; i++) {
      ctx.insertEntity(pieces[i].id, 'piece', pieces[i])
    }*/
}

populateContext()