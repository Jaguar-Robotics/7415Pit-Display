import React, {useEffect, useState} from "react"
import "./TeamInfo.css"
import packageJson from "../../package.json";
import {CheckImage, PullStatbotics, PullTBA, ShamBaseUrl} from "../util/APIUtil";
import {Match} from "../data/Data";
import {useLocalStorage} from "usehooks-ts";

let baseImagePath = "../resources/team-images/"

function TeamInfo(props: { teamNumber:number, activeTeam:boolean, upcomingMatch:Match|null}) {

    const year = packageJson.version.substring(0, 4);

    const [epa, setEPA] = useState<number>(0)
    const [tbaImgPath, setTbaImgPath] = useState<string>("")

    let [imageInShambase, setImageInShambase] = useState(false)

    let [eventKey] = useLocalStorage("eventKey", "")

    const [avatarPath, setAvatarPath] = useState<string>("")

    let [rank, setRank] = useState(-1)

    //Load the team rank
    useEffect(() => {
        PullTBA(`event/${eventKey}/rankings`, (data) => {
            let rank = data["rankings"].map(e => parseInt(e["team_key"].substring(3))).indexOf(props.teamNumber) + 1

            setRank(rank)
        })
    }, [props.teamNumber, props.upcomingMatch])

    function fetchEPA() {
        PullStatbotics(`team_year/${props.teamNumber}/${year}`, (data) => {
            setEPA(data.epa_end)
        })
    }

    function fetchTBAImage(onlyAvatar:boolean) {
        PullTBA(`team/frc${props.teamNumber}/media/${year}`, async (data) => {
            let shouldSkip = false

            for(let i=0; i<data.length;i++) {
                let e = data[i]

                if (e.type === "avatar") {
                    setAvatarPath(e.details.base64Image)
                }

                if (!onlyAvatar) {
                    if (shouldSkip) return
                    if (e.direct_url !== '') {

                        shouldSkip = await checkImage(e.direct_url).then((r:any) => {
                            if(r.status === 'ok') {
                                setTbaImgPath(e.direct_url)
                                return true
                            } else {
                                return false
                            }

                        })

                    }
                }
            }
        })
    }

    const checkShamBase = () => {
        CheckImage(props.teamNumber).then(result => {
            setImageInShambase(result)
        })
    }

    useEffect(() => {
        //Clear the current TBA image location (don't retain old images on match change)
        setTbaImgPath("")
        
        fetchEPA()
        fetchTBAImage(false)
        checkShamBase()
    }, [props.teamNumber])

    return (

        <div className={"team-display " + (props.activeTeam ? "active" : "inactive")}>
            {
                props.upcomingMatch != null ?
                    <p className={"small-info-text"}><b>In: {props.upcomingMatch.convertToHumanReadableName()}</b></p>
                    : null
            }
            <div className={"header-info"}>
                {avatarPath !== "" ?
                    <img className={"avatar"} src={`data:image/png;base64,${avatarPath}`} alt={"team avatar"}/> : null
                }
                <h2 className={avatarPath === "" ? "center" : ""}>{props.teamNumber}</h2>
            </div>
            <p className={"small-info-text"}><b>Rank: {rank}</b></p>
            {getImg()}
            <div>
                <h3>EPA: {epa}</h3>
            </div>
        </div>

    )

    function checkImage(path) {
        return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve({path, status: 'ok'});
                img.onerror = () => resolve({path, status: 'error'});

                img.src = path;
            }
        );
    }

    function getImg() {

        try {

            if(imageInShambase) {
                return <img className={"bot-image"}
                            src={ShamBaseUrl + `bytes/get/key/${props.teamNumber}-img`}
                            alt={"Error"}></img>
            } else {
                return <img className={"bot-image"}
                            src={tbaImgPath}
                            alt={"No Image"}></img>
            }

        } catch (error) {
            fetchTBAImage(false)

            return <img className={"bot-image"}
                        src={require("../resources/no-team-image.jpg")}
                        alt={"None Found"}></img>

        }
    }
}


export default TeamInfo;