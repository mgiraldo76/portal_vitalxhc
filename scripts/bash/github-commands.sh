# chmod +x github-commands.sh


#	Create your new branch
#git checkout -b <branchname>
branchname="fixes_to_telnyx5"       # the branch name - always populate with the branch name in question
createbranch=""     # yes 
commitcomment="adding key"    # the commit comment
ispush="yes"           # yes when ready to push

if [ -n "$branchname" ]; then

    if [ -n "$createbranch" ]; then
        echo ""
        echo "Creating Branch via git checkout -b: $branchname"
        git checkout -b "$branchname"
        echo ""
    fi # end checkout branch

    if [ -n "$commitcomment" ]; then
      
        # when ready to commit then run: git commit -am 'small desc' every time 
        #                           you want to secure code, but not yet publish
        echo ""
        echo "Commiting using  -m: $commitcomment"
        git add .
        git commit -m "$commitcomment"
        echo ""

        if [ -n "$ispush" ]; then
            echo ""
            echo "Push branch --set upstream origin $branchname"
            git push --set-upstream origin "$branchname"
            echo ""
        fi # end if there is a Push command

    fi #end if there is a commit comment
fi


#   Now it is time to merge
#	In the GitHub desktop app, make sure you are on your branch
#	Select from “Branch -> Preview Pull Request” from the top navigation bar of the app
#	Selected Create Pull Request in the bottom of the popup
#	Open Pull Request in the browser

#	Once in the browser, then follow the instructions to merge the branch

#   IMPORTANT: Post Merge Act   ions
#	Once your branch has been merged, go back to GitHub desktop and select branch “main”
#	Click fetch and then pull if the changes were not already pulled
#	You may now create your new branch


# DEPLOYING TO DEVPORTAL
# firebase target:clear hosting dev-portal 
# firebase target:apply hosting dev-portal devportalgladgradecom
# firebase deploy --only hosting:dev-portal
