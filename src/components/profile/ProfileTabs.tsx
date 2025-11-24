import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users, Image, Video, UserCheck } from 'lucide-react';

interface ProfileTabsProps {
  children: {
    posts: React.ReactNode;
    about: React.ReactNode;
    friends: React.ReactNode;
    photos: React.ReactNode;
    videos: React.ReactNode;
    tagged: React.ReactNode;
  };
}

export const ProfileTabs = ({ children }: ProfileTabsProps) => {
  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none">
        <TabsTrigger 
          value="posts" 
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          Publications
        </TabsTrigger>
        <TabsTrigger 
          value="about"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          <User className="h-4 w-4 mr-2" />
          À propos
        </TabsTrigger>
        <TabsTrigger 
          value="friends"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          <Users className="h-4 w-4 mr-2" />
          Amis
        </TabsTrigger>
        <TabsTrigger 
          value="photos"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          <Image className="h-4 w-4 mr-2" />
          Photos
        </TabsTrigger>
        <TabsTrigger 
          value="videos"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          <Video className="h-4 w-4 mr-2" />
          Vidéos
        </TabsTrigger>
        <TabsTrigger 
          value="tagged"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Identification
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="posts" className="mt-0">
          {children.posts}
        </TabsContent>
        <TabsContent value="about" className="mt-0">
          {children.about}
        </TabsContent>
        <TabsContent value="friends" className="mt-0">
          {children.friends}
        </TabsContent>
        <TabsContent value="photos" className="mt-0">
          {children.photos}
        </TabsContent>
        <TabsContent value="videos" className="mt-0">
          {children.videos}
        </TabsContent>
        <TabsContent value="tagged" className="mt-0">
          {children.tagged}
        </TabsContent>
      </div>
    </Tabs>
  );
};